'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { contributorQueueLabel } from '../../lib/crm-contributor-queue.mjs';

export default function CrmContributor({ records }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/crm/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ companyName, reference }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to submit company for review');
      setCompanyName('');
      setReference('');
      setMessage(payload.statusLabel || 'Submitted for account review.');
      router.refresh();
    } catch (error) {
      setMessage(error.message || 'Unable to submit company for review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="crm-contributor-page">
      <section className="crm-contributor-panel" aria-labelledby="crm-contributor-title">
        <p className="member-kicker">Plinko CRM · contributor intake</p>
        <h1 id="crm-contributor-title">Submit a company for review</h1>
        <p className="crm-contributor-intro">Share a company with the review queue. The CRM team will review the submission before any later step.</p>

        <form className="crm-contributor-form" onSubmit={submit}>
          <label htmlFor="company-name">Company name
            <input id="company-name" name="companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required maxLength="200" autoComplete="organization" />
          </label>
          <label htmlFor="company-reference">Website or LinkedIn <span>(optional)</span>
            <input id="company-reference" name="reference" value={reference} onChange={(event) => setReference(event.target.value)} maxLength="500" inputMode="url" placeholder="https://…" />
          </label>
          <button className="btn btn-green" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit company for review'}</button>
          {message ? <p className="crm-contributor-message" role="status">{message}</p> : null}
        </form>

        <section className="crm-contributor-list" aria-labelledby="submitted-accounts-title">
          <h2 id="submitted-accounts-title">Your submitted companies</h2>
          {records.length ? <div className="admin-list">{records.map((record) => (
            <article className="admin-request" key={record.id}>
              <header><strong>{record.displayName}</strong><span>{contributorQueueLabel(record.queueState)}</span></header>
              {record.externalReference ? <p>{record.externalReference}</p> : null}
            </article>
          ))}</div> : <p>You have not submitted any companies for review yet.</p>}
        </section>
      </section>
    </main>
  );
}
