# BRAND — Premium Car Detailing

A cinematic, scroll-driven marketing site for a premium car-detailing studio in CITY.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, GSAP + ScrollTrigger,
Lenis, Framer Motion, and the Supabase JS client.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — Supabase is not required yet
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Before changing anything

Read **[AGENTS.md](./AGENTS.md)**. It defines the stack, folder structure, design tokens,
typography, animation rules, performance budgets, and the content rule.

Short version:

- All copy, prices, reviews, phone numbers, and image paths live in `config/site.ts`.
- Scroll animation = GSAP ScrollTrigger inside `gsap.context()`, synced with Lenis,
  simplified on mobile, static under `prefers-reduced-motion`.
- Amber is reserved for the final Payoff scene.
- The homepage sections are built in the order Payoff → Wash → Macro → Coating →
  Proof → Footer (see `AGENTS.md` §9).

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm start
```
