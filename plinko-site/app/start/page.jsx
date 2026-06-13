import StartWizard from '../../components/StartWizard';

export const metadata = {
  title: 'Start Here | Plinko Solutions — Find Your Dot',
  description:
    'Never used AI? Start here. Four plain-English questions show you where you sit on the AI adoption grid and the standard first steps from there. No jargon, no email required.',
};

export default function StartPage() {
  return (
    <main className="start-page">
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="/">
            <span className="brand-dots" aria-hidden="true">
              <span /><span /><span /><span />
            </span>
            Plinko Solutions
          </a>
          <div className="nav-links">
            <a href="/#what-is">What is a Harness?</a>
            <a href="/#pricing">Pricing</a>
            <a href="/#faq">FAQ</a>
            <a
              className="btn btn-green"
              href="https://cal.com/jonathan-mclemore-t2zmlc/steppingstones?duration=15"
            >
              Book a Strategy Session
            </a>
          </div>
        </div>
      </nav>
      <StartWizard />
    </main>
  );
}
