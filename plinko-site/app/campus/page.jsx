import DotStory from '../../components/DotStory';

const WIZARD = '/start?src=campus';
const SKOOL = 'https://www.skool.com/citizen-developer-1179/about';
const CAL = 'https://cal.com/jonathan-mclemore-t2zmlc/steppingstones?duration=15';

export const metadata = {
  title: 'The Open Campus for AI | $49/mo — learn to put AI to work, no code, no IT team',
  description:
    'AI is replacing the busiest part of your week. The Open Campus shows you how to use it: a 30-day map, weekly live calls, playbooks, and a community of 289 — $49/month.',
  openGraph: {
    title: 'The Open Campus for AI — your 30-day map starts here',
    description:
      'Learn to automate the work eating your time. No code. No IT team. One small win a week.',
  },
};

const CAMPUS_STAGES = [
  {
    sw: '#d9d5cc',
    stat: '84% · never used AI',
    big: '8.1B',
    title: 'Most of the world has never touched AI.',
    body: 'Each dot is ~3.2 million people. If AI feels like it’s not for you — you’re in the majority. This page was built for exactly that.',
  },
  {
    sw: '#57b176',
    stat: '16% · tried a free chatbot',
    big: '1.3B',
    title: 'Some people ask it questions.',
    body: 'Useful — but a chat window doesn’t hand you your Tuesday afternoons back. The busiest part of your week is still yours to do.',
  },
  {
    sw: '#e3a51c',
    stat: '~0.3% · pays for AI',
    big: '15–25M',
    title: 'A few pay $20 a month for it.',
    body: 'Better answers, same week. A subscription isn’t a system — most people never get past the chat box.',
  },
  {
    sw: '#d6453a',
    stat: '~0.04% · runs AI like a system',
    big: '2–5M',
    title: 'Then there’s the red dot.',
    body: 'A small group has AI quietly doing their repetitive work. They’re not smarter than you — they just had a map. The Campus is the map.',
    cta: { href: '#offer', text: 'See what’s inside ↓' },
  },
];

const TRACKS = [
  {
    sw: '#57b176',
    title: 'AI Automation',
    body: 'The 30/60/90-day map. Automate your first repetitive task in month one — then stack the next, and the next.',
  },
  {
    sw: '#e3a51c',
    title: 'Web Agents & Research',
    body: 'Put agents on the open web: research, monitoring, and lookups that used to eat your evenings.',
  },
  {
    sw: '#d6453a',
    title: 'Build Apps with AI',
    body: 'MVPs and internal tools without a dev team. If you can describe it, you can ship a working version.',
  },
];

const LIBRARY = [
  { sw: '#d9d5cc', cat: 'Start Here', items: 'Find your dot · the 30/60/90 map · the weekly operating rhythm of a working founder' },
  { sw: '#57b176', cat: 'Revenue Engine', items: 'ICP & offer builders · lead sourcing production line · outbound playbooks · reply handling · a duplicable CRM' },
  { sw: '#57b176', cat: 'Delivery Engine', items: 'Client onboarding · proposal acceleration · project run sheets · reporting & QBR templates' },
  { sw: '#e3a51c', cat: 'Agent Workforce', items: 'Agent employee files · automation gallery · browser agents · governance pack & approval gates' },
  { sw: '#d6453a', cat: 'The Scoreboard', items: 'The KPI dictionary · weekly review ritual · dashboards · the Day-30 ROI snapshot' },
  { sw: '#d9d5cc', cat: 'The Vault', items: 'Agentic workbench · context dictionary · AI twins · the honest stack-and-costs list' },
];

export default function CampusPage() {
  return (
    <main className="impact">
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="/campus">
            <span className="brand-dots" aria-hidden="true">
              <span /><span /><span /><span />
            </span>
            The Open Campus for AI
          </a>
          <div className="nav-links">
            <a href="#offer">What’s Inside</a>
            <a href="#library">The Library</a>
            <a href="#business">For Business</a>
            <a href="/about">About</a>
            <a className="btn btn-red btn-hero" href={WIZARD}>Join the Campus</a>
          </div>
        </div>
      </nav>

      {/* ===== Dot hero (~40s of the 90s scroll) ===== */}
      <DotStory stages={CAMPUS_STAGES} />

      {/* ===== Manifesto ===== */}
      <section className="panel manifesto">
        <div className="wrap">
          <p className="manifesto-kicker">the open campus for ai</p>
          <h2>
            AI is replacing the busiest part of your week. <em>This is where you learn to use it</em><span className="red-dot" />
          </h2>
          <p className="manifesto-sub">No code. No IT team. No jargon. One small win a week, alongside 289 people doing the same.</p>
        </div>
      </section>

      {/* ===== The offer — one screen ===== */}
      <section className="panel" id="offer">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><span className="sw" style={{ background: '#d6453a' }} />the campus pass</div>
            <h2>Everything you need to put AI to work.</h2>
          </div>
          <div className="offer-split">
            <div className="offer-card">
              <div className="offer-tag" style={{ background: 'var(--green-deep)' }}>learn</div>
              <h3>A map, not a maze</h3>
              <ul>
                <li>The 30-day roadmap: automate your first repetitive task — starting today</li>
                <li>Three core tracks: AI Automation, Web Agents &amp; Research, Build Apps with AI</li>
                <li>The 2-minute quiz finds your starting point, the map meets you there</li>
              </ul>
            </div>
            <div className="offer-card">
              <div className="offer-tag" style={{ background: 'var(--red)' }}>never stuck</div>
              <h3>Live help, every week</h3>
              <ul>
                <li>Weekly live strategy calls — get unstuck, share wins, see what’s working</li>
                <li>The full Campus Library: playbooks, prompt vault, agent cards (see below)</li>
                <li>A community that answers — members have documented $10K+ in reclaimed time</li>
              </ul>
            </div>
          </div>
          <div className="offer-price">
            <div className="price">$49<small>/month · founding rate, locked for life</small></div>
            <p className="pledge-line">
              Cancel anytime. Pricing changes at 500 members — there are 289 on campus today.
            </p>
            <a className="btn btn-red btn-xl" href={WIZARD}>Join the Campus &rarr;</a>
            <div className="trust-row">
              <span>cancel anytime</span>
              <span>founding rate locked</span>
              <span>no code, no IT team</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Tracks ===== */}
      <section className="panel alt">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><span className="sw" style={{ background: '#57b176' }} />three tracks, one map</div>
            <h2>Pick a track. Win your week back.</h2>
          </div>
          <div className="grid-3">
            {TRACKS.map((t) => (
              <div className="card" key={t.title}>
                <span className="sw" style={{ background: t.sw, width: 14, height: 14, borderRadius: 4, display: 'block' }} />
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Library ===== */}
      <section className="panel" id="library">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><span className="sw" style={{ background: '#e3a51c' }} />the campus library</div>
            <h2>The filing cabinet of a working business.</h2>
            <p>
              Not a resource pile — the operating system of a working business, sanitized and handed over.
              Every playbook has an owner, a trigger, and the number it moves. Unlock wings as your belt advances.
            </p>
          </div>
          <div className="grid-3">
            {LIBRARY.map((l) => (
              <div className="card" key={l.cat}>
                <span className="sw" style={{ background: l.sw, width: 14, height: 14, borderRadius: 4, display: 'block' }} />
                <h3>{l.cat}</h3>
                <p>{l.items}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== The ladder: learn it vs. have it built ===== */}
      <section className="panel alt" id="business">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker"><span className="sw" style={{ background: '#d6453a' }} />more than a classroom</div>
            <h2>Learn it for $49. Or have it built for you.</h2>
            <p>
              The Campus teaches you to run AI yourself. If you’re already running a business, Plinko builds the
              whole system — workflows, integrations, approval gates — and hands you the keys. You own it outright.
            </p>
          </div>
          <div className="grid-3">
            <div className="card price-card">
              <h3>Campus Pass</h3>
              <div className="price">$49<small>/mo</small></div>
              <div className="price-sub">The starting point — learn it yourself</div>
              <ul>
                <li>30-day roadmap + 3 tracks</li>
                <li>Weekly live strategy calls</li>
                <li>Full Campus Library</li>
                <li>One small win a week</li>
              </ul>
              <a className="btn btn-ghost" href={WIZARD}>Join the Campus</a>
            </div>
            <div className="card price-card">
              <h3>Starter Harness</h3>
              <div className="price">$10k+ <small>MRR businesses</small></div>
              <div className="price-sub">Done for you — one core workflow</div>
              <ul>
                <li>Built around your exact stack</li>
                <li>Live in 14 days</li>
                <li>Approval gates on sensitive actions</li>
                <li>You own everything — no platform fees</li>
              </ul>
              <a className="btn btn-ghost" href={CAL}>Book a Strategy Session</a>
            </div>
            <div className="card price-card popular">
              <span className="pop-tag">For growing teams</span>
              <h3>Business Harness</h3>
              <div className="price">$50k+ <small>MRR businesses</small></div>
              <div className="price-sub">Done for you — the full operating layer</div>
              <ul>
                <li>Multi-agent system, up to 4 workflows</li>
                <li>5+ integrations, advanced governance</li>
                <li>Team training + full handoff</li>
                <li>Optional Ongoing Care from $750/mo</li>
              </ul>
              <a className="btn btn-green" href={CAL}>Book a Strategy Session</a>
            </div>
          </div>
          <p style={{ textAlign: 'center', marginTop: 32, color: 'var(--muted)', fontSize: 15 }}>
            Every harness build starts with a strategy session — the fee is credited toward your build. Campus
            members get priority scheduling. <a href="/" style={{ color: 'var(--green-dark)' }}>Full business details →</a>
          </p>
        </div>
      </section>

      {/* ===== Proof ===== */}
      <section className="panel">
        <div className="wrap proof-wrap">
          <div>
            <div className="kicker" style={{ justifyContent: 'flex-start' }}>
              <span className="sw" style={{ background: '#e3a51c' }} />who runs the campus
            </div>
            <h2>A coach’s patience. A builder’s receipts.</h2>
            <p className="proof-body">
              Jonathan McLemore builds private AI operating systems for $10k–$50k+ MRR businesses — research,
              drafting, follow-up, and ops running inside the tools they already use. The Open Campus is the same
              playbook, taught: one small win a week, in plain English. Start in the classroom or skip straight to
              the build — the quiz routes you either way.
            </p>
            <a className="btn btn-ghost" href={WIZARD}>Find your starting point &rarr;</a>
          </div>
          <div className="proof-quotes">
            <blockquote>“As a mentor he’s great and so dedicated I would like to experience his service in every lifetime!”<span>— Ali M.</span></blockquote>
            <blockquote>“He helped me set up my AI and has been super helpful in boosting my productivity through his teachings.”<span>— David M.</span></blockquote>
            <blockquote>“The help he provides is always delivered in a digestible manner — one that helps me understand it quickly.”<span>— Joshua W.</span></blockquote>
          </div>
        </div>
      </section>

      {/* ===== Quiet impact line ===== */}
      <section className="quiet-impact">
        <div className="wrap">
          <p>
            <span className="sw" style={{ background: 'var(--green)', width: 10, height: 10, borderRadius: 3 }} />
            The quiet part: a portion of every membership goes to youth sports and education programs in our partner
            communities. You’ll see it in your monthly member report — receipts, not guilt trips.
            {' '}<a href="mailto:ai@twlv20.com?subject=Community%20Partner%20—%20Open%20Campus">Run a league or school program?</a>
          </p>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="panel final-impact">
        <div className="wrap">
          <div className="kicker"><span className="sw" style={{ background: '#d6453a' }} />2,500 dots. yours is waiting.</div>
          <h2>Class is in session. Find your dot.</h2>
          <a className="btn btn-red btn-xl" href={WIZARD}>Join the Campus &rarr;</a>
          <div className="trust-row">
            <span>2-minute quiz first</span>
            <span>cancel anytime</span>
            <span>289 members · founding pricing ends at 500</span>
          </div>
          <p style={{ marginTop: 26, fontSize: 14.5, color: 'var(--muted)' }}>
            Running a $10k+/mo business? The quiz will route you to a build instead — or{' '}
            <a href={CAL} style={{ color: 'var(--green-dark)' }}>book a strategy session directly</a>.
          </p>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-base" style={{ borderTop: 'none', paddingTop: 0 }}>
            <span>© 2026 Plinko Solutions · The Open Campus for AI</span>
            <span className="foot-legend">
              <span><span className="sw" style={{ background: '#d9d5cc' }} />never used AI</span>
              <span><span className="sw" style={{ background: '#57b176' }} />learning</span>
              <span><span className="sw" style={{ background: '#d6453a' }} />running systems</span>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
