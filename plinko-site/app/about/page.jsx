const CAL = 'https://cal.com/jonathan-mclemore-t2zmlc/steppingstones?duration=15';

export const metadata = {
  title: 'About Plinko Solutions | Practical AI Systems Built for Real Operations',
  description:
    'Jonathan McLemore and Plinko Solutions — private AI systems, multi-agent workflows, and measurable operational results. Built by an operator, for businesses that need real execution.',
};

const RESULTS = [
  {
    n: '$24K',
    title: 'Recruitment workflow acceleration',
    body: 'Net-new pipeline within three weeks for a SAP-integrated recruitment firm — CRM and API automation that eliminated manual handoffs and compressed sales-cycle velocity.',
  },
  {
    n: '~$18K',
    title: 'Events-client recovery',
    body: 'AI-driven email classification and triage wired into the CRM, recovering roughly $18K in closed contract value through faster follow-up and cleaner workflow handling.',
  },
  {
    n: '$200K–300K+',
    title: 'Tax-lien lead engine',
    body: '24/7 lead-sourcing pipeline with sub-5-minute publish-to-dial latency, feeding 14 sales reps a large attributable monthly pipeline through custom capture and routing.',
  },
];

const DIFFS = [
  { sw: '#57b176', title: 'Implementation over hype', body: 'Instead of selling broad AI ideas, Plinko designs and deploys systems that actually run inside the day-to-day business.' },
  { sw: '#57b176', title: 'Owned environments', body: 'Private AI harnesses, assistant lanes, and workflow systems built around control and long-term usability — not platform lock-in.' },
  { sw: '#e3a51c', title: 'Business-side outcomes', body: 'Strongest where better lead handling, cleaner workflows, pipeline visibility, and lower manual overhead matter most.' },
  { sw: '#d6453a', title: 'Solutions-engineering DNA', body: 'Pre-sales architecture, technical discovery, and proof-of-value discipline — systems revenue teams can sell, operators can run, and stakeholders can understand.' },
];

const TAGS = ['Solutions Engineer', 'SaaS & API Integrations', 'Pre-Sales Architecture', 'HubSpot + Make.com', 'SAP + IBM WatsonX', 'AI Enablement'];

export default function AboutPage() {
  return (
    <main>
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="/">
            <span className="brand-dots" aria-hidden="true">
              <span /><span /><span /><span />
            </span>
            Plinko Solutions
          </a>
          <div className="nav-links">
            <a href="/">Home</a>
            <a href="/campus">The Campus</a>
            <a href="#founder">Founder</a>
            <a href="#results">Results</a>
            <a className="btn btn-red btn-hero" href={CAL}>Book a Strategy Session</a>
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section style={{ paddingTop: 170 }}>
        <div className="wrap">
          <div className="section-head" style={{ maxWidth: 760 }}>
            <div className="kicker"><span className="sw" style={{ background: '#d6453a' }} />about plinko solutions</div>
            <h2 style={{ fontSize: 'clamp(34px, 5vw, 54px)' }}>
              Private AI systems, built by an operator, for businesses that need real execution.
            </h2>
            <p>
              Plinko turns AI from a buzzword into operating infrastructure: private systems, multi-agent
              workflows, and assistant lanes that improve sales execution, streamline operations, and create
              measurable outcomes.
            </p>
            <p style={{ marginTop: 26 }}>
              <a className="btn btn-red" href={CAL}>Book a Strategy Session</a>{' '}
              <a className="btn btn-ghost" href="#founder" style={{ marginLeft: 10 }}>Meet the founder</a>
            </p>
          </div>
        </div>
      </section>

      {/* ===== Results ===== */}
      <section id="results" style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><span className="sw" style={{ background: '#57b176' }} />receipts, not hype</div>
            <h2>Selected results</h2>
            <p>Real solutions-engineering work across SaaS, RevOps, recruiting, events, and professional services.</p>
          </div>
          <div className="grid-3">
            {RESULTS.map((r) => (
              <div className="card" key={r.title}>
                <div className="stat-n" style={{ fontSize: 38 }}>{r.n}</div>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </div>
            ))}
          </div>
          <div className="trust-row" style={{ marginTop: 36 }}>
            <span>private — built for ownership</span>
            <span>practical — workflows, gates, ROI</span>
            <span>lean — output before headcount</span>
          </div>
        </div>
      </section>

      {/* ===== Founder ===== */}
      <section id="founder">
        <div className="wrap proof-wrap">
          <div>
            <div className="kicker" style={{ justifyContent: 'flex-start' }}>
              <span className="sw" style={{ background: '#e3a51c' }} />founder
            </div>
            <h2>Jonathan McLemore</h2>
            <p className="proof-body">
              Solutions engineer and founder of Plinko Solutions, with 5+ years bridging sales and engineering
              across B2B SaaS, RevOps, automation, and enterprise content workflows — technical discovery, API and
              CRM architecture, proof-of-value demos, and implementation design for founders, ops leaders, and
              enterprise stakeholders.
            </p>
            <p className="proof-body">
              Not an AI influencer. The approach is grounded in execution: understand how a business runs, find
              where revenue or operations break down, and build systems that reduce manual work while improving
              consistency, speed, and adoption.
            </p>
            <div className="tools" style={{ justifyContent: 'flex-start' }}>
              {TAGS.map((t) => (
                <span className="tool" key={t}><span className="sw" />{t}</span>
              ))}
            </div>
          </div>
          <div className="proof-quotes">
            <blockquote>
              <strong style={{ fontStyle: 'normal', fontFamily: 'var(--sans)' }}>Operator lens</strong><br />
              Builds with a presales architect’s mindset: technical discovery first, then systems that map cleanly to business outcomes.
            </blockquote>
            <blockquote>
              <strong style={{ fontStyle: 'normal', fontFamily: 'var(--sans)' }}>Implementation style</strong><br />
              Designs around the client’s existing stack, approval gates, and adoption realities — not a new software habit.
            </blockquote>
            <blockquote>
              <strong style={{ fontStyle: 'normal', fontFamily: 'var(--sans)' }}>Business goal</strong><br />
              Help teams own their AI layer, reduce admin drag, and create leverage where operations and revenue meet.
            </blockquote>
          </div>
        </div>
      </section>

      {/* ===== Differentiators ===== */}
      <section style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><span className="sw" style={{ background: '#d6453a' }} />what makes plinko different</div>
            <h2>Practical, owned, operationally useful.</h2>
          </div>
          <div className="grid-4">
            {DIFFS.map((d) => (
              <div className="card" key={d.title}>
                <span className="sw" style={{ background: d.sw, width: 14, height: 14, borderRadius: 4, display: 'block' }} />
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How we work ===== */}
      <section>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><span className="sw" style={{ background: '#57b176' }} />how plinko works with clients</div>
            <h2>Assess. Design &amp; deploy. Refine.</h2>
          </div>
          <div className="grid-3">
            <div className="card step">
              <div className="step-n">01 <span className="step-dots"><span className="f" /><span /><span /></span></div>
              <h3>Assess</h3>
              <p>Map how the business actually runs, where repetitive work accumulates, and where AI improves throughput without adding complexity.</p>
            </div>
            <div className="card step">
              <div className="step-n">02 <span className="step-dots"><span className="f" /><span className="f" /><span /></span></div>
              <h3>Design &amp; deploy</h3>
              <p>Build the private system, connect the right tools, define assistant roles, and make the workflows operationally useful.</p>
            </div>
            <div className="card step">
              <div className="step-n">03 <span className="step-dots"><span className="f" /><span className="f" /><span className="f" /></span></div>
              <h3>Refine</h3>
              <p>Improve performance over time, close reliability gaps, and evolve the operating layer as the business grows.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Vision ===== */}
      <section className="panel manifesto">
        <div className="wrap">
          <p className="manifesto-kicker">long-term vision</p>
          <h2>
            More than services. <em>A command layer for modern business</em><span className="red-dot" />
          </h2>
          <p className="manifesto-sub">
            A Hermes-powered business command center: voice interfaces, agent orchestration, KPI visibility, and
            decision support in one controlled environment. Not more software dependence — a clearer operating
            system for how lean teams run with AI.
          </p>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="final">
        <div className="wrap">
          <div className="kicker"><span className="sw" style={{ background: '#d6453a' }} />next step</div>
          <h2>Exploring AI, but need a cleaner operational path?</h2>
          <p>
            Start in the Campus for $49/month, or book a strategy session and have the system built for you —
            the fee is credited toward your build.
          </p>
          <a className="btn btn-red" href={CAL}>Book a Strategy Session</a>{' '}
          <a className="btn btn-ghost" href="/campus" style={{ marginLeft: 10 }}>Explore the Campus</a>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-base" style={{ borderTop: 'none', paddingTop: 0 }}>
            <span>© 2026 Plinko Solutions · Built with OpenClaw and Hermes</span>
            <span className="foot-legend">
              <span><a href="https://www.linkedin.com/in/jonathan-mclemore-997712175/" style={{ color: 'inherit' }}>LinkedIn</a></span>
              <span><a href={CAL} style={{ color: 'inherit' }}>Book a Session</a></span>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
