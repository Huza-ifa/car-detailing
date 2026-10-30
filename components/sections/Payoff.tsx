"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  gsap,
  MOBILE_QUERY,
  MOTION_QUERY,
  REDUCED_MOTION_QUERY,
} from "@/lib/gsap";
import { createFrameSequence } from "@/lib/frameSequence";
import { cn } from "@/lib/utils";
import { site } from "@/config/site";

/**
 * 03 — Payoff
 *
 * SCRUBBED canvas frame sequence (shared player with the coating scene):
 * the section pins at "top top" (~120vh desktop / ~100vh mobile, no snap)
 * and scroll scrubs the sun flood — the dim garage fills with golden-hour
 * light that hits the car. ONE render function derives everything from the
 * same progress value: frame index (drawn on a DPR-capped canvas only when
 * the index changes), the copy glow across 60→100% (warm text-shadow +
 * brightness 0.7→1 + a small upward slide), the CTA fading in, and the
 * faint warm vignette at the end. No scroll lock; scrolling back reverses.
 *
 * Frames preload sequentially once the scene is within ~2 screens of the
 * viewport (200% IO margin, started exactly once). Frame 1 paints as soon
 * as it decodes and acts as the poster; the sequence only starts advancing
 * once ≥80% of frames are decoded. Rendering pauses off-screen.
 * Reduced motion paints the final frame with the static end-state copy.
 *
 * Frame paths/counters live in /config/site.ts → images.sunSeq
 * (FFmpeg: assets/keys-sun.mp4 → public/frames/sun + sun-m, per breakpoint).
 */

/** How far ahead of the viewport (in viewport heights) preloading starts. */
const PRELOAD_MARGIN = "200% 0px";

/** Fraction of the sequence that must decode before scrubbing advances. */
const MIN_LOADED = 0.8;

export default function Payoff() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLSpanElement | null)[]>([]);
  const cta = useRef<HTMLAnchorElement>(null);
  const vignette = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    const stageEl = stage.current;
    const canvasEl = frame.current;
    const glowEl = glow.current;
    const ctaEl = cta.current;
    const vigEl = vignette.current;
    if (!rootEl || !stageEl || !canvasEl || !glowEl || !ctaEl || !vigEl) {
      return;
    }
    const lineEls = lines.current.filter(Boolean) as HTMLSpanElement[];

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: `(min-width: 769px) and ${MOTION_QUERY}`,
          mobile: `${MOBILE_QUERY} and ${MOTION_QUERY}`,
          reduced: REDUCED_MOTION_QUERY,
        },
        (context) => {
          const { desktop: wide, reduced } = context.conditions ?? {};
          // Touch devices — even large ones — use the mobile tier: smaller
          // frame sets, shorter pins. The desktop tier assumes a mouse
          // (hover-capable, fine primary pointer).
          const touch = window.matchMedia(
            "(hover: none), (pointer: coarse)",
          ).matches;
          const desktop = wide && !touch;

          const seq = site.images.sunSeq;
          const count = desktop ? seq.desktopCount : seq.mobileCount;
          const player = createFrameSequence({
            canvas: canvasEl,
            stage: stageEl,
            base: desktop ? seq.desktopPath : seq.mobilePath,
            count,
            pad: seq.pad,
            ext: seq.ext,
            width: seq.width,
            height: seq.height,
            desktop,
            focusX: seq.focus.x,
            focusY: seq.focus.y,
            preloadMargin: PRELOAD_MARGIN,
            minLoadedFraction: MIN_LOADED,
            reduced,
          });

          // Reduced motion: the player paints the final frame and the copy
          // below shows its static end state — no pin, no scrub, no glow ramp.
          if (reduced) return () => player.dispose();

          const setVignette = gsap.quickSetter(vigEl, "opacity") as (
            value: number,
          ) => void;

          const state = { progress: 0 };
          let currentFrame = -1;
          let lastGlowT = -1;
          let ctaClickable = false;

          // ONE render function — frame index, copy glow/brightness/slide,
          // CTA fade and vignette all derive from the same progress value.
          const render = (p: number) => {
            const idx = Math.min(count - 1, Math.max(0, Math.floor(p * count)));
            if (idx !== currentFrame) {
              currentFrame = idx;
              player.queueDraw(idx);
            }

            // 0 below 60% of the scrub, →1 at 100%.
            const glowT = gsap.utils.clamp(0, 1, (p - 0.6) / 0.4);

            // Copy: dim → full brightness with a small upward slide, plus a
            // warm text glow that only exists past the 60% mark. The slide is
            // a transform (cheap); brightness + text-shadow repaint the text
            // block, so they only apply when glowT meaningfully changed.
            gsap.set(glowEl, { y: 18 * (1 - glowT) });
            if (lastGlowT < 0 || Math.abs(glowT - lastGlowT) > 0.005) {
              lastGlowT = glowT;
              gsap.set(glowEl, {
                filter: `brightness(${(0.7 + 0.3 * glowT).toFixed(3)})`,
              });
              gsap.set(lineEls, {
                textShadow: `0 0 ${(4 + 20 * glowT).toFixed(1)}px rgba(245, 158, 11, ${(
                  0.35 * glowT
                ).toFixed(3)})`,
              });
            }

            // The CTA is invisible until the glow arrives — keep it
            // unclickable while invisible so it can't take a stray tap.
            gsap.set(ctaEl, { opacity: glowT });
            const clickable = glowT > 0.05;
            if (clickable !== ctaClickable) {
              ctaClickable = clickable;
              gsap.set(ctaEl, {
                pointerEvents: clickable ? "auto" : "none",
              });
            }
            setVignette(0.5 * glowT);
          };

          gsap.to(state, {
            progress: 1,
            ease: "none",
            duration: 1,
            scrollTrigger: {
              trigger: rootEl,
              start: "top top",
              // ~120vh desktop / ~100vh mobile — the payoff stays the
              // shortest pin on the page. No snap (removed per user
              // feedback — reads as auto-scrolling).
              end: desktop ? "+=120%" : "+=100%",
              pin: true,
              pinSpacing: true,
              scrub: 0.5,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
            onUpdate: () => render(state.progress),
          });

          render(0);

          return () => player.dispose();
        },
      );

      return () => mm.revert();
    }, rootEl);

    return () => ctx.revert();
  }, []);

  const copy = site.copy.payoff;
  // Frame 1 as a static DOM poster under the canvas — the scene stays
  // visible even if the player can't run, and serves as the LCP candidate
  // for the opening scene.
  const posterUrl = `${site.images.sunSeq.desktopPath}${String(1).padStart(site.images.sunSeq.pad, "0")}.${site.images.sunSeq.ext}`;

  return (
    <section
      id="payoff"
      data-section="payoff"
      aria-label={site.sections.payoff.label}
      ref={root}
      className="relative bg-background"
    >
      <div
        ref={stage}
        className="stage-full relative w-full overflow-hidden"
      >
        {/* Static poster under the canvas (fail-safe) — scrub by scroll above */}
        <Image
          src={posterUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
        <canvas
          ref={frame}
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full"
        />

        {/* faint warm vignette — fades in over the last stretch of the scrub */}
        <div
          ref={vignette}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(120%_100%_at_75%_80%,rgba(245,158,11,0.25),rgba(245,158,11,0.07)_48%,transparent_72%)] opacity-0 motion-reduce:opacity-100"
        />

        {/* seam melts above and below the plate — no hard cuts */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-gradient-to-b from-background via-background/35 to-transparent max-md:h-24"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-background/80 to-transparent"
        />

        {/* stage copy, lower left — glow + brightness + slide ramp 60→100% */}
        <div className="pointer-events-none absolute bottom-24 left-6 z-40 md:bottom-32 md:left-16">
          <div ref={glow}>
            <h1 className="text-display">
              {copy.headlineLines.map((line, index) => (
                <span
                  key={line.text}
                  ref={(el) => {
                    lines.current[index] = el;
                  }}
                  className={cn(
                    "block motion-reduce:[text-shadow:0_0_24px_rgba(245,158,11,0.35)]",
                    line.accent && "text-warm",
                  )}
                >
                  {line.text}
                </span>
              ))}
            </h1>

            <div className="mt-10 md:mt-12">
              {/* Booking drawer ships later — the CTA drives phone bookings. */}
              <a
                ref={cta}
                href={site.contact.phoneHref}
                className="pointer-events-none motion-reduce:pointer-events-auto inline-flex items-center gap-3 rounded-full bg-warm px-7 py-4 text-[11px] font-semibold uppercase tracking-eyebrow text-background transition-[filter] duration-300 hover:brightness-110 active:scale-[0.98] opacity-0 motion-reduce:opacity-100 max-[768px]:text-sm"
              >
                {copy.cta}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  <path
                    d="M2.5 8h10.5M9 3.5 13.5 8 9 12.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
