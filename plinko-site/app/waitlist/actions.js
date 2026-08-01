'use server';

import { redirect } from 'next/navigation';

import { captureWaitlistEntry } from '../../lib/waitlist.mjs';

const TERMS_VERSION = '2026-08-01';

export async function submitWaitlist(formData) {
  let destination = '/waitlist?joined=1';
  try {
    await captureWaitlistEntry({ submission: {
      email: formData.get('email'), firstName: formData.get('firstName'), accountType: formData.get('accountType'),
      company: formData.get('company'), desiredOutcome: formData.get('desiredOutcome'), source: formData.get('source') || 'portal_waitlist',
      referralCode: formData.get('ref'), website: formData.get('website'),
      productUpdatesConsent: formData.get('productUpdatesConsent') === 'yes', termsVersion: TERMS_VERSION,
    } });
  } catch (error) {
    const text = error instanceof Error ? error.message : '';
    destination = text.includes('rate_limit') ? '/waitlist?error=busy' : /valid email|account type|want to access|Consent|source|referral/i.test(text) ? '/waitlist?error=invalid' : '/waitlist?error=unavailable';
  }
  redirect(destination);
}
