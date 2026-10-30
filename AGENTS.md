# AGENTS.md — BRAND Detailing

> **This file is the source of truth for every future prompt in this repository.**
> Read it fully before changing code. If a request conflicts with this document, ask
> before breaking a rule. When a rule genuinely changes, update this file in the same
> change so it stays authoritative.

---

## 1. Project

A premium car-detailing marketing site for **BRAND** in **CITY**.

The experience is dark, cinematic, and scroll-driven: a bold condensed display face,
generous negative space, near-black surfaces, cyan highlights, and one single amber
"payoff" moment at the end. Copy is short and confident. Motion is smooth, never
gratuitous, and always accessible.

Business goals, in order:

1. Make the detailing work feel premium and obsessive.
2. Drive bookings (phone + Book Now).
3. Load fast on a mid-range phone.

---

## 2. Stack

| Layer        | Choice                                       | Version / notes                          |
| ------------ | -------------------------------------------- | ---------------------------------------- |
| Framework    | Next.js                                      | **14.x**, App Router                     |
| Language     | TypeScript                                   | strict mode                              |
| Styling      | Tailwind CSS                                 | 3.4.x                                    |
| Scroll       | GSAP + ScrollTrigger + Lenis                 | one Lenis instance; GSAP ticker drives it |
| Smooth scroll| Lenis                                        | `lenis` package (not `@studio-freight`)   |
| UI motion    | Framer Motion                                | navbar, hover, micro-interactions only   |
| Backend      | Supabase JS                                  | browser client factory in `/lib`          |
| Fonts        | `next/font/google`                           | Bebas Neue + Inter                       |
| Images       | `next/image`                                 | static export: `unoptimized` (see §7)    |
| Hosting      | Netlify                                      | static export (`out/`), `netlify.toml`; **zip deploys must use forward-slash entry paths** (`.NET ZipArchive`/`bsdtar` — never `Compress-Archive`, whose backslash entries 404 every nested asset) |
| Asset tools  | `sharp` (devDep) + FFmpeg (winget build)     | raw `assets/` → optimized `public/img`    |

Commands:

```bash
npm run dev     # http://localhost:3000
npm run build   # production build must pass
npm run lint    # eslint must pass
```

Environment variables (see `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The Supabase client is optional at build time. `getSupabaseBrowserClient()` returns
`null` and logs a dev-only warning when env vars are missing. Never commit secrets;
only `NEXT_PUBLIC_*` values may reach the browser.

---

## 3. Folder structure

```
/app
  layout.tsx            Root layout: fonts, metadata, SmoothScroll, Navbar
  page.tsx              Homepage composition only (no section internals)
  robots.ts             robots.txt route
  globals.css           Tailwind layers, base styles, Lenis + scaffold classes
  favicon.ico

/components
  SmoothScroll.tsx      "use client" — Lenis instance + GSAP/ScrollTrigger sync + context
  Navbar.tsx            "use client" — fixed, backdrop-blur, hide on scroll down
  /ui
    GrainOverlay.tsx       3% film-grain overlay for photographic scenes
  /sections
    WashScene.tsx       Pinned wash scrub: real wash video frame sequence + sweep, meter
    Payoff.tsx          Scrubbed sun-flood canvas sequence (~120vh pin, glow ramp,
                        vignette, tel: booking CTA)
    MacroReveal.tsx     Pinned paint macro zoom + clip reveal; mobile comparison slider
    CoatingScene.tsx    Scrubbed coating-wipe canvas sequence (~150vh desktop /
                        ~100svh mobile pin, sweep
                        line driven by the measured edge map edge.json; meter = scroll)
    Proof.tsx           Reviews, before/after gallery, replaying count-up stats,
                        rotating testimonials
    Footer.tsx          Contact block (curtain), giant cropped brand — no CTA stage

/config
  site.ts               ALL content: brand, contact, services, add-ons, reviews, images
                        (services/addOns data retained; the Services section was
                        removed from the homepage by user request)

netlify.toml           Netlify deploy: builds static export from /out
/lib
  gsap.ts               Registers ScrollTrigger once; exports gsap/ScrollTrigger + queries
  supabase.ts           Browser Supabase client factory (lazy, env-guarded)
  perf.ts               One-time ~40fps probe → "lighter mode" (skips decorative
                        parallax/particles on slow devices); stamps html.low-perf
  washParticles.ts      "use client"-style canvas engine for the WashScene wipe (dynamic import)
  frameSequence.ts      Shared canvas frame-sequence player (CoatingScene + Payoff):
                        DPR-capped cover-fit, rAF-batched draws, IO-gated
                        sequential preload, optional load-threshold gate
  utils.ts              cn(), formatPrice(), priceForVehicle()

/public/img              Optimized AVIF/WebP assets; see public/img/README.md
/public/seq/wash, /wash-m FFmpeg-extracted wash video frames (scrubbed by WashScene)
/public/frames/coating, /coating-m FFmpeg coating-wipe frame sequence (scrubbed canvas
                        player in CoatingScene) + edge.json measured wipe-edge map
/public/frames/sun, /sun-m FFmpeg sun-flood frame sequence (scrubbed canvas player in Payoff)
```

Rules:

- New shared UI goes in `/components`; new page sections in `/components/sections`.
- `/config` must stay framework-agnostic (plain data, no React, no `"use client"`) so it
  can be imported by server and client components.
- `/lib` may hold client-safe helpers. Mark files `"use client"` only when they touch
  browser APIs or GSAP.
- Keep `app/page.tsx` a thin composition of section components.
- Prefer Server Components. Push `"use client"` down to the smallest leaf that needs it.
- Do not create additional top-level directories without updating this file.

---

## 4. Design tokens

Defined once in `tailwind.config.ts`, mirrored as CSS custom properties in
`app/globals.css`. Use Tailwind classes in components; use the hex values only in
JS/GSAP or raw CSS.

| Token      | Tailwind           | Value                    | Usage                                      |
| ---------- | ------------------ | ------------------------ | ------------------------------------------ |
| Background | `bg-background`    | `#07090c`                | Page background, nav base                  |
| Surface    | `bg-surface`       | `#0e1217`                | Cards, panels, elevated sections           |
| Border     | `border-line`      | `rgba(255,255,255,.08)`  | Hairlines, dividers, card borders          |
| Text       | `text-ink`         | `#e8ecf1`                | Primary text                               |
| Muted      | `text-muted`       | `#8a94a3`                | Secondary text, labels, metadata           |
| Accent     | `text-accent` / `bg-accent` | `#22d3ee`       | CTAs, active states, cyan light             |
| Warm       | `text-warm` / `bg-warm`     | `#f59e0b`       | **PAYOFF SCENE ONLY** (see rule below)     |

Visual rules:

- Backgrounds stay near-black. No pure `#000`. No light sections.
- Surfaces are separated with hairlines and subtle elevation, not heavy shadows.
- Amber (`warm`) is **only** allowed inside the Payoff scene. Never in the navbar,
  services, hover states, gradients, or anywhere else in the page. It is the payoff.
- Cyan is the functional accent: CTAs, focus, small indicators. Use sparingly.
- Radii: `rounded-none` to `rounded-sm` for editorial sections; pill shapes only for
  small controls/tags.
- Avoid colored body text. Muted gray for secondary, ink for primary.

Spacing / layout:

- Content max width: `1440px` (`max-w-[1440px]`), gutters `px-6` mobile, `md:px-10`,
  `lg:px-16`.
- Section padding: `py-24` mobile, `md:py-32`, `lg:py-40`; full-bleed scenes can
  ignore this when pinned.
- Use generous negative space. Do not fill every viewport with cards.

---

## 5. Typography

- **Display:** Bebas Neue (fallback: Anton), loaded with `next/font/google` as
  `--font-display`. Always uppercase. Tight tracking (`tracking-tight` to
  `tracking-[-0.02em]`). Line height `0.86–0.95`.
- **Body:** Inter, loaded as `--font-body`. Sentence case. Muted gray for support copy.
- Headlines are **1–3 words**, huge on desktop:
  `clamp(56px, 12vw, 160px)` via the `.text-display` utility. Never let a headline wrap
  into a paragraph.
- Eyebrows/labels: uppercase, wide tracking (`tracking-[0.3em]`), muted.
  Sizes: **14px on mobile (≤768px, the `.text-eyebrow` media query handles
  this), 10–12px on md+** — the mobile floor is a legibility requirement from
  the responsive QA spec; desktop keeps the smaller editorial labels.
- Body copy: 16–18px, max `65ch`, leading `1.6`.
- Use `text-balance` for short headings and `text-pretty` where supported.
- Do not add new font families. Do not use font weights Bebas Neue does not have.

Utility classes in `globals.css`: `.text-display`, `.text-eyebrow`, `.section-shell`,
`.container-site`, `.brand-sheen` (6s gradient sweep clipped to glyphs, footer brand
line only).
Reuse them instead of redefining type scales.

---

## 6. Animation rules (non-negotiable)

### 6.1 Lenis + ScrollTrigger

There is exactly **one** Lenis instance, created in `components/SmoothScroll.tsx`.
It is driven by the GSAP ticker and keeps ScrollTrigger in sync:

```ts
lenis.on("scroll", ScrollTrigger.update);

const raf = (time: number) => lenis.raf(time * 1000);
gsap.ticker.add(raf);
gsap.ticker.lagSmoothing(0);
```

Never create a second Lenis instance. Never use `html { scroll-behavior: smooth; }`.
In client components, get the instance with `useLenis()` and use `lenis.scrollTo()` for
anchor navigation. Lenis is disabled (smoothing off) under `prefers-reduced-motion`.

### 6.2 Every scroll animation uses gsap.context()

Each section owns its animations in a `useEffect` and reverts them on unmount:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, MOBILE_QUERY } from "@/lib/gsap";

export default function Section() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: "(min-width: 769px) and (prefers-reduced-motion: no-preference)",
          mobile: `${MOBILE_QUERY} and (prefers-reduced-motion: no-preference)`,
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { desktop, mobile, reduced } = context.conditions ?? {};

          if (reduced) {
            // Show the static END state. No pin, no scrub, no fade.
            gsap.set("[data-reveal]", { opacity: 1, y: 0 });
            return;
          }

          gsap.from("[data-reveal]", {
            opacity: 0,
            y: desktop ? 64 : 24,
            stagger: 0.08,
            scrollTrigger: {
              trigger: root.current,
              start: "top 75%",
              once: true,
            },
          });

          if (desktop) {
            // Heavy pinned scene only on desktop.
          }
        },
      );

      return () => mm.revert();
    }, root);

    return () => ctx.revert();
  }, []);

  return <section ref={root}>…</section>;
}
```

Rules:

- `gsap.context()` around **all** GSAP work in a component, scoped to the section ref.
- Cleanup with `ctx.revert()` (and `mm.revert()` inside the context).
- Mobile (`max-width: 768px`) gets a simpler variant: no pinning, no long scrubs,
  shorter distances, fewer simultaneous tweens.
- `prefers-reduced-motion: reduce` always renders the **static end state**. Never hide
  content behind an animation that will not run.
- Animate `transform` and `opacity` only. Avoid animating `top`, `left`, `width`,
  `height`, `filter` on large elements.
- Pinned scenes: `anticipatePin: 1`, `invalidateOnRefresh: true`, and call
  `ScrollTrigger.refresh()` after fonts/images settle:
  `document.fonts.ready.then(() => ScrollTrigger.refresh())`.
- Use `once: true` for simple reveals. Do not leave ScrollTriggers that no longer do
  anything.
- Do not let GSAP and Framer Motion animate the same property of the same element.
- Framer Motion is for UI state (navbar hide/show, tabs, hover). Scroll scenes are GSAP.

### 6.3 ScrollTrigger hygiene

- Register plugins **only** in `lib/gsap.ts`. Components import from there.
- Every trigger must be inside the section's `gsap.context()` scope.
- `ScrollTrigger.refresh()` after layout-affecting changes (images loaded, accordions).
- Do not create triggers at module scope or in render.
- No scroll-jacking beyond the Lenis smoothing. Pins must release cleanly.

### 6.4 Triggered scene pattern (Payoff defrost)

Scene transitions are **triggered timelines**, not long scrubs:

1. A ScrollTrigger onEnter fires the one-time trigger (short scene
   transitions like `Payoff`'s defrost).
2. The paused GSAP timeline plays (time-based, 1–3s).
3. `onLeaveBack` (or scroll-to-top): `timeScale(2–3).reverse()` so the
   scene resets; reverse-complete re-arms.
4. `isAnimating`-style guard (`phase !== "idle"` return) prevents restarts
   mid-play. Cleanup must detach every window listener.
5. Reduced motion: skip the timeline entirely — set the final state.
6. Pinned scenes use short `end: "+=100–130%"` values (never 300%+). Lenis
   runs `duration: 0.9, wheelMultiplier: 1`. **Scroll snapping is NOT used on
   pinned scenes** — a snap tween that moves the page on its own mid-pin read
   as "auto scrolling" and was removed per user feedback.
7. Scroll locking (`lenis.stop()` + capture-phase wheel/touch/keydown
   blockers) was removed with the Hero section; no current scene locks
   scroll. If a future scene ever needs one, build a single shared lock with
   a hard failsafe release — never a per-scene `lenis.stop()` without a
   guaranteed release, and never swallow Tab/focus keys.

---

## 7. Performance rules

- `next/image` for **every** raster image except scrub-sequence sprites: the
  WashScene frame sequence swaps a single `<img>`'s `src` (still with explicit
  width/height) because per-frame `next/image` optimization of 120 identical
  16:9 JPEG/WebP frames adds nothing. Everything else uses `next/image`.
- Production is a **Next.js static export** (`output: "export"`, images
  `unoptimized`): no API routes or middleware exist, and every route is
  prerendered, so the SSR functions of the Next runtime would be dead weight.
  Masters in `/public/img` are pre-optimized WebP (≤2400px), so serving them
  raw is by design. Keep `next/image` in JSX so dev/SSR still behave, and
  keep explicit `width`/`height`.
- Images are AVIF/WebP (`next.config.mjs` formats, in that order). Source assets live in
  `/public/img`.
- No `priority` images: the opening scene is a canvas frame sequence, not a
  single `<img>`; everything raster uses `loading="lazy"` (default) and
  accurate `sizes`.
- Always provide `width`/`height` (or a fixed `aspect-ratio` wrapper with `fill`) to
  prevent layout shift. Reserve height for pinned/scroll scenes.
- Fonts only through `next/font` (self-hosted at build). No Google Fonts `<link>`.
- Keep `"use client"` boundaries small. Never mark the page or layout as client.
- Prefer CSS transforms/opacity; avoid layout thrash and scroll listeners that write
  state on every frame.
- Do not import GSAP into server components.
- Full-screen scene stages use the `.stage-full` / `.stage-mobile-short`
  utilities (globals.css) — 100vh fallback then 100svh — never bare `h-[100svh]`.
- Non-essential decoration (Proof/Footer parallax drift, wash seam drift, foam
  particles) waits for `detectLowPerf()` (lib/perf.ts) and is skipped on devices
  that fail the ~40fps probe. Core scrubbed scenes are never gated.
- Target: LCP < 2.5s on mobile, CLS < 0.05, no long tasks from scroll handlers.

---

## 8. Content rule (non-negotiable)

**All copy, services, prices, reviews, city, phone, and image paths live in
`/config/site.ts`.** No hardcoded marketing copy, phone numbers, addresses, prices, or
image paths in components.

```tsx
// ✅
<h1>{site.brand.tagline}</h1>
<span>{site.contact.phoneDisplay}</span>

// ❌
<h1>Obsessive care. Flawless finish.</h1>
<span>(555) 010-2020</span>
```

Guidelines:

- If you need new copy, add it to the typed `SiteConfig` first, then render it.
- Prices are numbers in config; format with `formatPrice()` / `priceForVehicle()`.
- Images are `ImageAsset` objects: `{ src, alt, width, height }`. Alt text lives in
  config with the asset.
- Placeholder brands/city/phone stay generic until real data is supplied. Do not invent
  a real business, address, or testimonial.

---

## 9. Section map & build status

| # | Component       | id          | Scene intent                                                      | Status      |
| - | --------------- | ----------- | ----------------------------------------------------------------- | ----------- |
| 1 | `Payoff`        | `payoff`    | **Opening scene + page h1.** Scrubbed sun-flood canvas sequence, shared player (~120/100vh pin, scrub 0.5, static DOM poster img under the canvas — failsafe if the player can't run —, glow ramp 60→100% + warm vignette, tel: CTA; NO scroll lock). **Only section allowed to use amber.** | built       |
| 2 | `WashScene`     | `wash`      | Pinned wash scrub: real wash video frame sequence + sweep, meter (~190vh desktop / ~100svh mobile pin, no snap) | built      |
| 3 | `MacroReveal`   | `macro`     | Scrubbed macro scene: "LOOK CLOSER." → "SWIRLS. EVERYWHERE." → lens clip reveal → "SWIRLS OUT. GLASS ON." (~100vh pin, no snap; no scroll lock, no ring) | built       |
| 4 | `CoatingScene`  | `coating`   | Scrubbed coating-wipe canvas sequence, wash-scene grammar: "NOW SEAL IT." → "SEALED. SHINE LOCKED IN." + chips (~150vh desktop / ~100svh mobile pin, no snap, sweep line driven by the measured edge map `edge.json` + meter on scroll progress, static DOM poster img under the canvas, NO scroll lock) | built       |
| 5 | `Proof`         | `proof`     | Reviews + before/after gallery (2 cards, 3-layer parallax, replaying count-up stats, draggable comparisons, 4s testimonial rotation, desktop tilt ≤4°; no pin, no lock) | built       |
| 6 | `Footer`        | `contact`   | Closing statement + curtain contact block, giant cropped brand + 6s sheen (light parallax only, no lock, no CTA stage) | built       |

Order (changed by user request — Services section removed from the homepage, footer
CTA stage removed, Payoff swapped ahead of the Hero, then the Hero section removed
entirely and the component + its `lib/scrollLock.ts` dependency deleted in the
finalize pass): Payoff → Wash → Macro → Coating → Proof → Footer. Booking flows
through the Payoff `tel:` CTA
and the navbar CTA (→ `#contact`) until the booking drawer ships; `Services`/`ServicesCopy`
data stays in config for reuse. The homepage renders them in this order.

---

## 10. Accessibility & SEO

- One `<h1>` per page, in the opening Payoff scene (the Hero section was removed;
  its headline slot moved there). Sections use `<h2>`.
- Landmarks: single `<main id="main">`, `<nav aria-label="Primary">`, `<footer>`.
- Skip link is provided in the root layout. Keep it working.
- Focus states: visible cyan outline (`:focus-visible` in globals). Never remove outlines.
- Navbar hide-on-scroll must reveal on keyboard focus (`onFocusCapture`).
- Decorative images: `alt=""`; meaningful images: descriptive alt from config.
- Respect `prefers-reduced-motion` for Lenis, GSAP, and Framer Motion.
- Keep contrast: muted `#8a94a3` on `#07090c` is for secondary text only, not long copy.
- Metadata, Open Graph, and viewport theme color come from `site` in `app/layout.tsx`.
- Links must be real anchors/`Link`s with descriptive text. No clickable `<div>`s.

---

## 11. Supabase

- Use `getSupabaseBrowserClient()` from `/lib/supabase.ts`. It is lazy and singleton.
- Never instantiate a second client in a component.
- Browser code may only use the anon key. Service-role keys belong in server-only routes,
  never in `NEXT_PUBLIC_*`.
- If a section needs server data, create a Server Component or route handler; do not
  convert the whole page to a client component.
- Booking submissions, if added, must validate input server-side and handle failures
  gracefully. Do not add auth or database tables without an explicit request.

---

## 12. Definition of done

Before calling any task complete:

1. `npm run lint` passes.
2. `npm run build` passes (TypeScript + production build).
3. `npm run dev` starts without errors or hydration warnings.
4. Desktop and mobile (≤768px) both checked, including reduced-motion mode.
5. No horizontal scroll; no layout shift when images/fonts load.
6. All new copy/prices/images live in `config/site.ts`.
7. ScrollTriggers are scoped and reverted; no console warnings.
8. Amber appears only in the Payoff scene.
9. This file is updated if structure, tokens, or rules changed.

---

## 13. Working agreements for future prompts

- Read `AGENTS.md` and the relevant files before editing.
- Do not rewrite working files wholesale; make targeted changes that match existing style.
- Do not add dependencies without a clear reason. If you add one, update the stack table.
- Do not build sections that were not requested. Shells stay shells until asked.
- Placeholder data is intentional. Keep it clearly generic; never fabricate real reviews,
  addresses, or credentials.
- When a prompt is ambiguous about visuals, favor the restrained, premium direction:
  fewer elements, more space, stronger type.
- Report exactly which files changed and how you verified the result.
