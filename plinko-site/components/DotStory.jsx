'use client';

import { useEffect, useRef, useState } from 'react';

const COLS = 50;
const ROWS = 50;
const GREEN_COUNT = 400; // 16% of 2500
const AMBER_COUNT = 7; // ~0.3%

const COLORS = {
  grey: '#d9d5cc',
  green: '#57b176',
  amber: '#e3a51c',
  red: '#d6453a',
};

const CAL = 'https://cal.com/jonathan-mclemore-t2zmlc/steppingstones?duration=15';

const STAGES = [
  {
    sw: COLORS.grey,
    stat: '84% · never used AI',
    big: '8.1B',
    title: 'Most of the world has never touched AI.',
    body: 'Each dot is ~3.2 million people. About 6.8 billion of them have never used an AI tool — not once. That includes most of the people running businesses like yours.',
    link: { href: '/start', text: 'In the grey? Start here →' },
  },
  {
    sw: COLORS.green,
    stat: '16% · free chatbot users',
    big: '1.3B',
    title: 'A billion people ask a chatbot questions.',
    body: 'They prompt, paste, and copy the answer back out. Useful — but it’s a conversation, not a system. Nothing runs unless they’re sitting there typing.',
  },
  {
    sw: COLORS.amber,
    stat: '~0.3% · pays $20/mo for AI',
    big: '15–25M',
    title: 'A thin band pays for the privilege.',
    body: 'Power users with a subscription. Better models, same workflow: they still do the research, the drafting, and the follow-up themselves — one chat at a time.',
  },
  {
    sw: COLORS.red,
    stat: '~0.04% · runs an agent harness',
    big: '2–5M',
    title: 'Then there’s the red dot.',
    body: 'A few million people run AI as a system — agents that research, draft, follow up, and report inside their own tools, around the clock. That sliver is where the leverage lives. Plinko puts your business in it.',
    cta: { href: CAL, text: 'Become the red dot →' },
  },
];

const clamp = (v) => Math.max(0, Math.min(1, v));

export default function DotStory({ stages = STAGES }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    let raf = 0;
    let currentStage = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onScroll = () => {
      const rect = wrap.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      progressRef.current = clamp(-rect.top / Math.max(total, 1));
    };

    const roundedSupported = typeof ctx.roundRect === 'function';

    const drawDot = (x, y, s, color) => {
      ctx.fillStyle = color;
      if (roundedSupported) {
        ctx.beginPath();
        ctx.roundRect(x, y, s, s, s * 0.28);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, s, s);
      }
    };

    const draw = (t) => {
      const p = progressRef.current;
      ctx.clearRect(0, 0, w, h);

      const size = Math.min(w, h);
      const cell = size / COLS;
      const ox = (w - size) / 2;
      const oy = (h - size) / 2;
      const s = Math.max(1, cell * 0.78);

      // fill amounts per stage window of the scroll
      const greenN = Math.round(GREEN_COUNT * clamp((p - 0.2) / 0.2));
      const amberN = Math.round(AMBER_COUNT * clamp((p - 0.48) / 0.16));
      const redOn = p > 0.72;

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const bottomRow = ROWS - 1 - row; // 0 = bottom row
          const idx = bottomRow * COLS + col; // fill order: bottom-up, left-to-right
          const isRed = bottomRow === 0 && col === COLS - 1;
          const amberSlot =
            bottomRow === 0 && col >= COLS - 1 - AMBER_COUNT && col < COLS - 1
              ? col - (COLS - 1 - AMBER_COUNT)
              : -1;

          let color = COLORS.grey;
          if (idx < greenN) color = COLORS.green;
          if (amberSlot >= 0 && amberSlot < amberN) color = COLORS.amber;
          if (isRed && redOn) color = COLORS.red;

          drawDot(ox + col * cell, oy + row * cell, s, color);
        }
      }

      // pulse ring on the red dot
      if (redOn) {
        const cx = ox + (COLS - 1) * cell + s / 2;
        const cy = oy + (ROWS - 1) * cell + s / 2;
        const phase = (t % 1800) / 1800;
        ctx.strokeStyle = `rgba(214, 69, 58, ${0.55 * (1 - phase)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.8 + phase * s * 2.6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // caption stage
      const next = p < 0.2 ? 0 : p < 0.48 ? 1 : p < 0.72 ? 2 : 3;
      if (next !== currentStage) {
        currentStage = next;
        setStage(next);
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    onScroll();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section className="story" ref={wrapRef} id="story" aria-label="AI adoption story">
      <div className="story-sticky">
        <div className="story-meta">
          2,500 dots = 8.1 billion humans &middot; color = most advanced AI interaction, Feb 2026
        </div>

        <div className="story-grid">
          <div className="story-captions">
            {stages.map((st, i) => (
              <div key={i} className={`story-caption ${i === stage ? 'on' : ''}`} aria-hidden={i !== stage}>
                <div className="story-stat">
                  <span className="sw" style={{ background: st.sw }} />
                  {st.stat}
                </div>
                <div className="big">{st.big}</div>
                <h2>{st.title}</h2>
                <p>{st.body}</p>
                {st.link && (
                  <a
                    href={st.link.href}
                    style={{
                      marginTop: 22,
                      fontFamily: 'var(--mono)',
                      fontSize: 14,
                      color: 'var(--green-dark)',
                      alignSelf: 'flex-start',
                    }}
                  >
                    {st.link.text}
                  </a>
                )}
                {st.cta && (
                  <a className="btn btn-red" href={st.cta.href}>
                    {st.cta.text}
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="story-canvas">
            <canvas ref={canvasRef} aria-hidden="true" />
          </div>
        </div>

        {stage === 0 && <div className="story-hint">scroll &darr;</div>}
      </div>
    </section>
  );
}
