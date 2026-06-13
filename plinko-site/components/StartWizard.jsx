'use client';

import { useState } from 'react';

const CAL = 'https://cal.com/jonathan-mclemore-t2zmlc/steppingstones?duration=15';
const SKOOL = 'https://www.skool.com/citizen-developer-1179/about';

const COLOR = {
  grey: '#d9d5cc',
  green: '#57b176',
  amber: '#e3a51c',
  red: '#d6453a',
};

const QUESTIONS = [
  {
    id: 'usage',
    q: 'Have you used AI before?',
    sub: 'Be honest — most of the world hasn’t. That’s fine.',
    options: [
      { v: 'grey', label: 'Never, or barely', desc: 'I’ve heard about it. Maybe clicked once.' },
      { v: 'green', label: 'I chat with a free AI sometimes', desc: 'ChatGPT, Claude, Gemini — the free version.' },
      { v: 'amber', label: 'I pay for AI tools', desc: 'A $20/mo subscription, or a few of them.' },
      { v: 'red', label: 'I run AI agents or automations', desc: 'Things happen without me typing every prompt.' },
    ],
  },
  {
    id: 'team',
    q: 'Who would this be for?',
    sub: 'No wrong answer — it changes the first steps.',
    options: [
      { v: 'solo', label: 'Just me', desc: 'Solo founder, freelancer, or operator.' },
      { v: 'small', label: 'My team of 2–10', desc: 'A lean business with a few people.' },
      { v: 'mid', label: 'A team of 11+', desc: 'Departments, managers, more moving parts.' },
      { v: 'curious', label: 'Just exploring', desc: 'No business yet — I want to understand AI.' },
    ],
  },
  {
    id: 'leak',
    q: 'Where does your week leak the most time?',
    sub: 'Pick the one that stings most.',
    options: [
      { v: 'research', label: 'Looking things up', desc: 'Prospects, competitors, prices — across too many tabs.' },
      { v: 'writing', label: 'Writing things', desc: 'Emails, proposals, posts that sit half-finished in drafts.' },
      { v: 'followup', label: 'Following up', desc: 'Leads and clients who go quiet and stay quiet.' },
      { v: 'admin', label: 'Admin & reporting', desc: 'Scheduling, data entry, status updates, spreadsheets.' },
    ],
  },
  {
    id: 'mrr',
    q: 'Roughly, your monthly revenue?',
    sub: 'Only used to suggest the right path. Skip if you like.',
    options: [
      { v: 'low', label: 'Under $10k / month', desc: 'Or pre-revenue.' },
      { v: 'starter', label: '$10k – $50k / month', desc: '' },
      { v: 'business', label: '$50k+ / month', desc: '' },
      { v: 'na', label: 'Rather not say', desc: '' },
    ],
  },
];

const PROMPT_BY_LEAK = {
  research:
    '“Here are three competitor websites: [paste links]. Summarize what each offers and tell me how my offer is different.”',
  writing:
    '“Draft a short, friendly follow-up email to a client who went quiet two weeks ago. I’ll paste the last thing they said.”',
  followup:
    '“Write me a 3-email follow-up sequence for a lead who asked for pricing and then vanished. Polite, not pushy.”',
  admin:
    '“Turn these messy notes into a clean status update for my team: [paste notes].”',
};

const PLANS = {
  grey: {
    headline: 'You’re in the grey — with 6.8 billion others.',
    sub: 'No catching up required. Three steps gets you ahead of 84% of the planet.',
    steps: (leak) => [
      { t: 'Make a free account', d: 'Go to claude.ai and sign up. That’s the entire step. No credit card, no setup.' },
      { t: 'Paste one real task', d: `Take something from your actual week and try it. For you, start with: ${PROMPT_BY_LEAK[leak]}` },
      { t: 'Repeat daily for one week', d: 'One real task a day. By Friday you’ll know exactly where AI saves you time — and where it doesn’t.' },
    ],
    bridge:
      'When you’re ready for AI that works while you don’t — research, drafts, and follow-ups that run without you typing — that’s a harness. The strategy session maps yours.',
  },
  green: {
    headline: 'You’re a green dot — you chat, but nothing runs without you.',
    sub: 'The gap between you and the red sliver isn’t skill. It’s a system.',
    steps: (leak) => [
      { t: 'Pick your one workflow', d: `Choose the thing you typed into a chatbot most this month. For you that’s probably ${leak === 'research' ? 'research and lookups' : leak === 'writing' ? 'drafting and writing' : leak === 'followup' ? 'follow-ups' : 'admin and reporting'}.` },
      { t: 'Write the steps down', d: 'Who does it, what triggers it, where the answer goes. One page. That document is the seed of a system.' },
      { t: 'Turn the page into agents', d: 'A strategy session takes that one-pager and maps it into agents running inside your actual tools — with you approving anything sensitive.' },
    ],
    bridge: 'You already know AI works. The session is about making it work without you.',
  },
  amber: {
    headline: 'Amber: you pay for AI. Now make it pay you back.',
    sub: 'Subscriptions made you faster. Ownership makes you leveraged.',
    steps: () => [
      { t: 'Audit your subscriptions', d: 'List what you pay for and what each one automates end-to-end without you in the loop. (For most people: nothing.)' },
      { t: 'Own your keys', d: 'Your own API key plus an open-source harness beats rented credits, caps, and overage bills. You pay the provider directly.' },
      { t: 'Pick what goes agentic first', d: 'The strategy session maps which of your workflows convert from chat-assisted to agent-run — and in what order.' },
    ],
    bridge: 'You’re one tier from the sliver. The session is the shortest path across.',
  },
  red: {
    headline: 'You’re already red — let’s make it bulletproof.',
    sub: 'Running agents is one thing. Owning a system your team can trust is another.',
    steps: () => [
      { t: 'Audit ownership', d: 'Who holds the code, the keys, the data? If the answer is a platform, you’re renting your red dot.' },
      { t: 'Check your gates', d: 'Anything customer-facing should pass a human approval gate. If it doesn’t, that’s your first fix.' },
      { t: 'Plan the expansion', d: 'A strategy session doubles as a harness audit: what to harden, what to add, what to hand to your team.' },
    ],
    bridge: 'Bring what you’ve built. We’ll pressure-test it and map what’s next.',
  },
};

const TIER = {
  business: { name: 'Business Harness', why: 'Multi-agent system, up to 4 workflows, 5+ integrations. Built for teams at $50k+ MRR.' },
  starter: { name: 'Starter Harness', why: 'One core workflow, 2 integrations, delivered in 14 days. Built for the $10k–$50k MRR range.' },
  free: { name: 'The Open Campus — $49/month', why: 'Start in the classroom: the 30-day map, weekly live calls, and the full Campus Library. When a harness would pay for itself, book the strategy session — the fee is credited toward your build.' },
};

function MiniGrid({ color }) {
  const dots = [];
  for (let i = 0; i < 100; i++) dots.push(i);
  // place "your dot": grey mid-field, green lower band, amber near corner, red corner
  const youIdx = color === 'grey' ? 34 : color === 'green' ? 81 : color === 'amber' ? 97 : 99;
  return (
    <div className="mini-grid" aria-hidden="true">
      {dots.map((i) => {
        const row = Math.floor(i / 10);
        let bg = COLOR.grey;
        if (row >= 8) bg = COLOR.green;
        if (i === 98) bg = COLOR.amber;
        if (i === 99) bg = COLOR.red;
        const you = i === youIdx;
        return (
          <span
            key={i}
            className={you ? 'you-dot' : ''}
            style={{ background: you ? COLOR[color] : bg, opacity: you ? 1 : 0.45 }}
          />
        );
      })}
    </div>
  );
}

export default function StartWizard() {
  const [step, setStep] = useState(-1); // -1 = intro
  const [answers, setAnswers] = useState({});
  const [isImpact] = useState(() => {
    if (typeof window === 'undefined') return false;
    const src = new URLSearchParams(window.location.search).get('src');
    return src === 'impact' || src === 'campus';
  });

  const pick = (id, v) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => s - 1);
  const restart = () => {
    setAnswers({});
    setStep(-1);
  };

  // ---- intro ----
  if (step === -1) {
    return (
      <div className="wizard">
        <div className="wiz-intro">
          <div className="kicker" style={{ justifyContent: 'flex-start' }}>
            <span className="sw" style={{ background: COLOR.red }} />
            standardized onboarding · 4 questions · 2 minutes
          </div>
          <h1>Find your dot.</h1>
          <p>
            Of 8.1 billion people, 84% have never used AI. Answer four plain-English questions and we’ll show you
            exactly where you sit on the grid — and the standard first steps from there. No jargon, no email required.
          </p>
          <button className="btn btn-green" onClick={() => setStep(0)}>
            Start &rarr;
          </button>
        </div>
      </div>
    );
  }

  // ---- result ----
  if (step >= QUESTIONS.length) {
    const color = answers.usage || 'grey';
    const plan = PLANS[color];
    const tierKey =
      answers.mrr === 'business' ? 'business' : answers.mrr === 'starter' ? 'starter' : 'free';
    // Routing: business-sized answers go to a build; everyone else goes to the Campus.
    const isBuild = tierKey === 'business' || tierKey === 'starter';
    const CAMPUS_TIER = {
      name: 'The Campus Pass — $49/month',
      why: 'The 30-day map starts at your dot — exactly where this quiz placed you. Weekly live calls, the full Campus Library, and a community of 289 working the same map. Founding rate locked for life, cancel anytime.',
    };
    let tier;
    let ctaHref;
    let ctaText;
    let altLink = null;
    if (isImpact && !isBuild) {
      tier = CAMPUS_TIER;
      ctaHref = SKOOL;
      ctaText = 'Join the Open Campus →';
      altLink = { href: CAL, text: 'Running a $10k+/mo business? Book a strategy session instead →' };
    } else if (isBuild) {
      tier = TIER[tierKey];
      ctaHref = CAL;
      ctaText = 'Book Your Strategy Session →';
      altLink = { href: SKOOL, text: 'Want to learn it yourself first? Join the Open Campus — $49/mo →' };
    } else {
      tier = TIER.free;
      ctaHref = '/campus';
      ctaText = 'Explore the Open Campus →';
    }
    const steps = plan.steps(answers.leak || 'writing');
    if (isImpact && !isBuild) {
      steps[2] = {
        t: 'Bring it to the Campus',
        d: 'The weekly live calls, the 30-day map, and the Campus Library pick it up from here — one small win a week.',
      };
    }

    return (
      <div className="wizard">
        <div className="wiz-result">
          <div className="wiz-result-head">
            <MiniGrid color={color} />
            <div>
              <div className="story-stat">
                <span className="sw" style={{ background: COLOR[color], width: 12, height: 12, borderRadius: 3 }} />
                your position on the grid
              </div>
              <h1>{plan.headline}</h1>
              <p className="wiz-sub">{plan.sub}</p>
            </div>
          </div>

          <ol className="wiz-steps">
            {steps.map((s, i) => (
              <li key={i}>
                <span className="wiz-step-n">{i + 1}</span>
                <div>
                  <strong>{s.t}</strong>
                  <p>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="wiz-bridge">
            <p>{plan.bridge}</p>
          </div>

          <div className="wiz-tier">
            <div className="kicker" style={{ justifyContent: 'flex-start' }}>
              <span className="sw" style={{ background: COLOR.green }} />
              suggested path
            </div>
            <h3>{tier.name}</h3>
            <p>{tier.why}</p>
            <a className="btn btn-red" href={ctaHref}>
              {ctaText}
            </a>
            <button className="wiz-restart" onClick={restart}>
              Start over
            </button>
            {altLink && (
              <p style={{ marginTop: 18, fontSize: 14 }}>
                <a href={altLink.href} style={{ color: 'var(--green-dark)' }}>{altLink.text}</a>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- question ----
  const q = QUESTIONS[step];
  return (
    <div className="wizard">
      <div className="wiz-progress">
        {QUESTIONS.map((_, i) => (
          <span key={i} className={i <= step ? 'f' : ''} />
        ))}
        <em>
          {step + 1} / {QUESTIONS.length}
        </em>
      </div>
      <h1>{q.q}</h1>
      <p className="wiz-sub">{q.sub}</p>
      <div className="wiz-options">
        {q.options.map((o) => (
          <button key={o.v} className="wiz-option" onClick={() => pick(q.id, o.v)}>
            <strong>{o.label}</strong>
            {o.desc && <span>{o.desc}</span>}
          </button>
        ))}
      </div>
      {step > 0 && (
        <button className="wiz-back" onClick={back}>
          &larr; back
        </button>
      )}
    </div>
  );
}
