# Plinko Solutions — adoption-curve scroll-story site

Next.js (App Router) remake of plinkosolutions.com, built around the "each dot is ~3.2 million people" AI adoption chart. The hero is a 2,500-dot canvas that recolors as you scroll: grey (never used AI) → green (free chatbot) → amber (pays $20/mo) → red (runs a harness). The red dot is the brand thesis.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

```bash
npx vercel        # preview
npx vercel --prod # production
```

Or push to GitHub and import in the Vercel dashboard. Zero config — defaults work.

## Structure

- `app/page.jsx` — all sections (bridge, harness, problems, how it works, pricing, compare, testimonials, FAQ, footer)
- `components/DotStory.jsx` — scroll-driven canvas dot grid (client component)
- `app/globals.css` — palette + design system (CSS variables at top)

## Tuning

- Palette: edit the variables at the top of `globals.css` (`--dot-grey`, `--green`, `--amber`, `--red`, `--paper`).
- Scroll pacing: `.story { height: 520vh }` in CSS controls total scroll length; stage thresholds (0.2 / 0.48 / 0.72) live in `DotStory.jsx`.
- Copy per stage: `STAGES` array in `DotStory.jsx`.
