import DotStory from '../components/DotStory';

const CAL = 'https://cal.com/jonathan-mclemore-t2zmlc/steppingstones?duration=15';

const PROBLEMS = [
  {
    sw: '#d9d5cc',
    title: 'Scattered research',
    body: 'Prospect data lives in five tabs, two spreadsheets, and a notebook. Your team repeats the same lookup every week.',
  },
  {
    sw: '#d9d5cc',
    title: 'Drafting delays',
    body: 'Proposals, follow-ups, and outreach sit in drafts for days because no one has time to polish them.',
  },
  {
    sw: '#d9d5cc',
    title: 'Follow-up gaps',
    body: 'Leads go cold after one email. CRM reminders are ignored. Revenue leaks through cracks in the process.',
  },
  {
    sw: '#d9d5cc',
    title: 'Ops overhead',
    body: 'Scheduling, data entry, and reporting eat hours that should go to closing deals and serving clients.',
  },
];

const STEPS = [
  {
    n: 1,
    title: 'Strategy Session',
    body: 'Book a paid 60-minute session. We map the workflows that cost you time or leak revenue, the tools your team already uses, and the approval gates that matter. You leave with a clear build plan — and the fee is credited toward your system.',
  },
  {
    n: 2,
    title: 'Build & Configure',
    body: 'We architect and deploy your private system using Claude Cowork, OpenClaw, and Plinko Pocket: integrations, specialized agent roles, approval gates, and the safety controls needed to move from demo behavior to real operational work.',
  },
  {
    n: 3,
    title: 'Handoff & Run',
    body: 'We train your team, document the system, and hand over full ownership. You control the workflows, the data, the integrations, and the operating layer — instead of renting access to someone else’s platform.',
  },
];

const TIERS = [
  {
    name: 'Starter Harness',
    price: '$10k+ MRR',
    sub: 'Single workflow, lean teams · payment plans available',
    items: ['Single core workflow', '2 integrations', 'Basic approval gates', '14-day delivery', '30 days of support'],
  },
  {
    name: 'Business Harness',
    price: '$50k+ MRR',
    sub: 'Multi-agent, growing teams · payment plans available',
    items: ['Multi-agent system', 'Up to 4 workflows', '5+ integrations', 'Advanced governance', '60-day support'],
    popular: true,
  },
  {
    name: 'Ongoing Care',
    price: '$750/m',
    sub: 'Optional — cancel anytime',
    items: ['Priority support', 'New skills & integrations', 'Monthly health checks', 'Monitoring & alerts', 'Quarterly reviews'],
  },
];

const COMPARE = {
  head: ['Factor', 'Plinko Harness', 'WorkClaw', 'In-house R&D'],
  rows: [
    ['Typical team size', 'Solopreneur to 10-person team', 'Any', '10+ person dev team'],
    ['Best for MRR', '$10k – $50k MRR+', '$0 – $100k MRR', '$100k MRR+'],
    ['Platform fees', 'None — open source', 'Required', 'None'],
    ['AI credit costs', 'You pay API provider directly', 'Markup + overages', 'You pay API provider directly'],
    ['Data ownership', 'You own everything', 'Hosted on their servers', 'You own everything'],
    ['Time to launch', '14 – 30 days', 'Same day', '3 – 6 months'],
    ['Customization', 'Built for your exact stack', 'Limited to their integrations', 'Unlimited (with dev team)'],
    ['Lock-in', 'None — open source', 'High — cancel = lose access', 'None'],
  ],
};

const TESTIMONIALS = [
  ['Ali M.', 'April 2026', 'Very down to earth as a person, as a mentor he’s great and so dedicated I would like to experience his service in every lifetime!!'],
  ['Nate G.', 'April 2026', 'Every time I’ve collaborated with Jonathan, he’s brought specialized knowledge and value to the table, along with a can-do spirit that moves projects forward. He’s a bit of a secret weapon when it comes to business efficiency and smarter system design.'],
  ['David M.', 'April 2026', 'Jonathan is really informed with everything AI. He helped me set up my OpenClaw and has been super helpful in boosting my productivity through his teachings.'],
  ['Patrick F.', 'April 2026', 'Highly recommend Jon as he has been my trusted source of all things AI and beyond. He’s diligent, hard working, and knows his stuff.'],
  ['Danyal K.', 'April 2026', 'Jonathan’s been a blessing. The guy knows his stuff and is always communicative!'],
  ['Elvira D.', 'April 2026', 'Jonathan is one of the most genuine, knowledgeable, and supportive people I’ve worked with. He leads with professionalism, great energy, and real passion for helping others succeed.'],
  ['Joshua W.', 'April 2026', 'I can say with absolute certainty that Jonathan is an excellent coach that offers a wealth of knowledge! No matter the situation, I can rely on Jonathan to help me navigate to the most optimal and ideal solution.'],
  ['Julia C.', 'April 2026', 'He is the absolute best. Always comes with great energy, passion, clarity and knowledge. He is professional and well spoken, and I received all materials in a timely manner.'],
  ['Nasser A.', 'April 2026', 'Jonathan has been very professional in providing support. He has been extremely helpful, even with the more tedious details.'],
  ['Shabbir N.', 'April 2026', 'Jonathan is a man of many talents. His attention to detail and documentation is the stuff of legends. Any interactions you’ll have with him will leave you walking away having learned something new.'],
  ['Carlos F.', 'April 2026', 'Speaking with Jonathan is the closest thing to talking with a genius. His depth of knowledge across different technology systems is truly remarkable — hands down the best coach I’ve worked with.'],
];

const FAQS = [
  ['What does “be the red dot” actually mean?', 'Of roughly 8.1 billion people, only ~0.04% — a few million — run AI as an operating system rather than a chat window. The red dot is shorthand for that tier: agents that research, draft, follow up, and report inside your own tools. Plinko builds you into it without you needing a dev team.'],
  ['What is an AI harness and why do I need one?', 'An AI harness is a configured system of AI agents, tools, and workflows that automates repetitive business work. You need one when your team spends too much time on research, drafting, follow-ups, data entry, and reporting instead of closing deals and serving clients. A harness connects Claude, OpenClaw, and Plinko Pocket to your existing tools and runs them with approval gates for sensitive actions.'],
  ['What is Claude Cowork for business?', 'Claude Cowork means configuring Anthropic’s Claude AI as an active coworker inside your tools — handling research, drafting, follow-ups, and operations through OpenClaw and Plinko Pocket, with human approval on sensitive actions.'],
  ['How is this different from WorkClaw?', 'WorkClaw charges monthly fees plus AI credits — you rent access. Plinko builds a harness you own outright: one-time cost, no recurring platform fees, no credit gates. You control the infrastructure and the data.'],
  ['What tools can the harness connect to?', 'Slack, Gmail, Google Workspace, Notion, Airtable, HubSpot, Salesforce, Calendly, and most tools with an API. We can also build custom integrations for proprietary or industry-specific tools.'],
  ['How long does it take to set up?', 'The Starter Harness is delivered in 14 days. The Business Harness typically takes 21–30 days depending on complexity. Both include a Strategy Session, build and configuration, and handoff with team training.'],
  ['Is my data safe?', 'Yes. The harness runs on infrastructure you control — typically a private VPS or your existing cloud account. We do not host your data. OpenClaw and Plinko Pocket run locally or on your servers, and all workflows include approval gates for sensitive actions.'],
  ['Do I need technical skills?', 'No. The harness is built for business users, not developers. We handle all technical setup, integration, and configuration. After handoff, your team interacts with the harness through familiar tools like Slack and email, with documentation and training included.'],
];

const TOOLS = ['Claude Cowork', 'OpenClaw', 'Plinko Pocket', 'Slack', 'Gmail', 'Google Workspace', 'Notion', 'Airtable', 'HubSpot', 'Salesforce', 'Calendly', 'Custom APIs'];

function Sw({ c }) {
  return <span className="sw" style={{ background: c }} />;
}

export default function Page() {
  return (
    <main>
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="#story">
            <span className="brand-dots" aria-hidden="true">
              <span /><span /><span /><span />
            </span>
            Plinko Solutions
          </a>
          <div className="nav-links">
            <a href="/start">Start Here</a>
            <a href="/about">About</a>
            <a href="#what-is">What is a Harness?</a>
            <a href="#how">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href="#compare">Compare</a>
            <a href="#faq">FAQ</a>
            <a className="btn btn-green" href={CAL}>Book a Strategy Session</a>
          </div>
        </div>
      </nav>

      {/* ===== Scroll story ===== */}
      <DotStory />

      {/* ===== Bridge ===== */}
      <section className="bridge">
        <div className="wrap">
          <h2>
            You don’t need to out-hire your market.
            <br />
            You need to be <em>the red dot</em><span className="red-dot" />
          </h2>
          <p>
            Plinko Solutions builds private AI operating systems for growing businesses — wired into the tools you
            already use, kept in house, and handed over as something you own from day one.
          </p>
          <a className="btn btn-red" href={CAL}>Book Your Strategy Session</a>
        </div>
      </section>

      {/* ===== What is a harness ===== */}
      <section id="what-is">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><Sw c="#d6453a" />the red-dot tier, explained</div>
            <h2>The red dot isn’t a smarter prompt. It’s a system.</h2>
            <p>
              An <strong>AI harness</strong> is the delivery model behind your AI operating system: a private setup of
              specialized agents, tools, and workflows that handles recurring business work inside Slack, Gmail, CRMs,
              calendars, and the rest of your stack. Multi-agent research keeps finding the same pattern — when
              research, drafting, checking, routing, and approvals are split into clear roles, reliability goes up.
              That’s what we build. And you own it outright.
            </p>
          </div>
          <div className="tools">
            {TOOLS.map((t) => (
              <span className="tool" key={t}><span className="sw" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Problems ===== */}
      <section style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><Sw c="#d9d5cc" />stuck in the grey and green</div>
            <h2>Most AI “solutions” create more work</h2>
            <p>
              Teams buy tools, burn credits, and still do the heavy lifting. The problem isn’t access to AI — 1.3
              billion people have that. It’s the lack of a system that can actually run research, drafting, checking,
              follow-up, and ops inside your workflows.
            </p>
          </div>
          <div className="grid-4">
            {PROBLEMS.map((p) => (
              <div className="card" key={p.title}>
                <Sw c={p.sw} />
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Stats ===== */}
      <div className="stats">
        <div className="wrap">
          <div><div className="stat-n">14</div><div className="stat-l">days to first workflow</div></div>
          <div><div className="stat-n">5+</div><div className="stat-l">integrations per harness</div></div>
          <div><div className="stat-n">0</div><div className="stat-l">monthly platform fees</div></div>
        </div>
      </div>

      {/* ===== How it works ===== */}
      <section id="how">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><Sw c="#57b176" />grey &rarr; green &rarr; red</div>
            <h2>How it works</h2>
            <p>Three phases from strategy to an AI operating system your team can actually run.</p>
          </div>
          <div className="grid-3">
            {STEPS.map((s, i) => (
              <div className="card step" key={s.n}>
                <div className="step-n">
                  0{s.n}
                  <span className="step-dots">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className={d <= i ? 'f' : ''} />
                    ))}
                  </span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section id="pricing" style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><Sw c="#e3a51c" />own it, don’t rent it</div>
            <h2>Simple, one-time pricing</h2>
            <p>
              Choose the plan that fits your revenue floor and workflow complexity. We scope around the business
              outcomes you want, the systems you need connected, and how much of the operating layer you want built
              now.
            </p>
          </div>
          <div className="grid-3">
            {TIERS.map((t) => (
              <div className={`card price-card ${t.popular ? 'popular' : ''}`} key={t.name}>
                {t.popular && <span className="pop-tag">Most Popular</span>}
                <h3>{t.name}</h3>
                <div className="price">{t.price}</div>
                <div className="price-sub">{t.sub}</div>
                <ul>
                  {t.items.map((i) => <li key={i}>{i}</li>)}
                </ul>
                <a className={`btn ${t.popular ? 'btn-green' : 'btn-ghost'}`} href={CAL}>Book Strategy Session</a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 32, color: 'var(--muted)', fontSize: 15 }}>
            Not sure which tier fits? The Strategy Session is credited toward your build.
          </p>
        </div>
      </section>

      {/* ===== Compare ===== */}
      <section id="compare">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><Sw c="#d6453a" />three ways into the sliver</div>
            <h2>Plinko vs. WorkClaw vs. doing it yourself</h2>
            <p>See how owning your harness compares to renting a platform or building in-house.</p>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {COMPARE.head.map((h, i) => (
                    <th key={h} className={i === 1 ? 'you' : ''}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.rows.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, i) => (
                      <td key={i} className={i === 1 ? 'you' : ''}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid-4" style={{ marginTop: 48 }}>
            <div className="card"><Sw c="#57b176" /><h3>One-time cost</h3><p>Pay for the build once. No recurring platform subscription draining your budget.</p></div>
            <div className="card"><Sw c="#57b176" /><h3>No credit gates</h3><p>Use your own API keys. No artificial usage limits or surprise overage bills.</p></div>
            <div className="card"><Sw c="#57b176" /><h3>You own the code</h3><p>You retain control of your code, integrations, and workflows.</p></div>
            <div className="card"><Sw c="#57b176" /><h3>Custom for your stack</h3><p>Not a generic template. Built around the tools your team actually uses.</p></div>
          </div>

          <div className="guarantee">
            <h3>If it does not work, we fix it</h3>
            <p>
              Every harness includes a 30-day fix window. If a workflow breaks or an integration fails, we repair it at
              no extra cost. No blame. Just a working system.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Testimonials ===== */}
      <section style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><Sw c="#57b176" />11 five-star reviews</div>
            <h2>What clients say</h2>
            <p>From founders, operators, and professionals who have worked with Jonathan.</p>
          </div>
          <div className="t-grid">
            {TESTIMONIALS.map(([name, date, quote]) => (
              <div className="t-card" key={name}>
                <blockquote>“{quote}”</blockquote>
                <div className="t-who">
                  <span className="t-av">{name.split(' ').map((w) => w[0]).join('')}</span>
                  <span>
                    <span className="t-name">{name}</span>
                    <br />
                    <span className="t-date">{date}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><Sw c="#d9d5cc" />questions</div>
            <h2>Questions</h2>
          </div>
          <div className="faq">
            {FAQS.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="final" style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="kicker"><Sw c="#d6453a" />2,500 dots. one is yours.</div>
          <h2>99.96% of the world isn’t running this yet.</h2>
          <p>
            That’s not a problem — it’s a head start. Book a strategy session and we’ll map the system that puts your
            business in the sliver.
          </p>
          <a className="btn btn-red" href={CAL}>Book Your Strategy Session</a>{' '}
          <a className="btn btn-ghost" href="/start" style={{ marginLeft: 10 }}>Never used AI? Start here</a>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <h3>Jonathan McLemore</h3>
              <div className="foot-role">Founder, Plinko Solutions</div>
              <p>
                Customer Success Manager in enterprise content management. I build practical AI harnesses for lean
                teams using OpenClaw, Plinko Pocket, and Claude. No jargon. Just systems that work.
              </p>
            </div>
            <div className="foot-links">
              <a href="https://plinkosolutions.com">Plinko Solutions</a>
              <a href="https://www.linkedin.com/in/jonathan-mclemore-997712175/">LinkedIn</a>
              <a href={CAL}>Book a Session</a>
            </div>
          </div>
          <div className="foot-base">
            <span>© 2026 Plinko Solutions · Built with OpenClaw and Plinko Pocket</span>
            <span className="foot-legend">
              <span><span className="sw" style={{ background: '#d9d5cc' }} />never used AI</span>
              <span><span className="sw" style={{ background: '#57b176' }} />chatbot</span>
              <span><span className="sw" style={{ background: '#e3a51c' }} />pays $20/mo</span>
              <span><span className="sw" style={{ background: '#d6453a' }} />runs a harness</span>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
