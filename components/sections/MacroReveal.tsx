"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  gsap,
  MOBILE_QUERY,
  MOTION_QUERY,
  REDUCED_MOTION_QUERY,
} from "@/lib/gsap";
import { site } from "@/config/site";

/**
 * 04 — Macro Reveal
 *
 * The scene is SCRUBBED — the user's scroll drives the whole sequence, so the
 * transition feels tactile: "LOOK CLOSER." over the filthy macro, then the
 * problem headline "SWIRLS. EVERYWHERE." arrives before any fix, the lens
 * expands from the center revealing mirror-clear paint, and only then does
 * the headline crossfade to "SWIRLS OUT. GLASS ON." with the service chips.
 *
 * Desktop: pinned for ~140vh (no snap). Mobile: same timeline, no
 * pin. Reduced motion: static finished power with the manual slider.
 */
export default function MacroReveal() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  const afterLayer = useRef<HTMLDivElement>(null);
  const headingA = useRef<HTMLSpanElement>(null);
  const headingC = useRef<HTMLSpanElement>(null);
  const headingB = useRef<HTMLSpanElement>(null);
  const chips = useRef<(HTMLSpanElement | null)[]>([]);
  const slider = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    const stageEl = stage.current;
    const zoomEl = zoom.current;
    const afterEl = afterLayer.current;
    const headingAEl = headingA.current;
    const headingCEl = headingC.current;
    const headingBEl = headingB.current;
    const chipEls = chips.current.filter(Boolean) as HTMLSpanElement[];
    const sliderEl = slider.current;
    if (
      !rootEl ||
      !stageEl ||
      !zoomEl ||
      !afterEl ||
      !headingAEl ||
      !headingCEl ||
      !headingBEl
    ) {
      return;
    }

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
          // Touch devices — even large ones — get the entry-scrub variant
          // instead of the pinned scene. The desktop tier assumes a mouse
          // (hover-capable, fine primary pointer).
          const touch = window.matchMedia(
            "(hover: none), (pointer: coarse)",
          ).matches;
          const desktop = wide && !touch;

          if (reduced) {
            gsap.set(zoomEl, { clearProps: "transform" });
            gsap.set(afterEl, { clearProps: "clipPath" });

            const apply = (value: number) => {
              afterEl.style.clipPath = `circle(${value}% at 50% 50%)`;
            };

            if (sliderEl) sliderEl.value = "75";
            apply(Number(sliderEl?.value ?? 75));

            const onSliderInput = (event: Event) => {
              apply(Number((event.currentTarget as HTMLInputElement).value));
            };
            sliderEl?.addEventListener("input", onSliderInput);

            return () => {
              sliderEl?.removeEventListener("input", onSliderInput);
              afterEl.style.removeProperty("clip-path");
            };
          }

          // --- scrubbed scene (scroll-driven) ------------------------------
          // User feedback: the auto-played time-based version didn't feel
          // connected to scrolling. Everything below is scrubbed — 1 unit ==
          // the full pinned 100vh (desktop) or the section-entry scroll
          // (mobile). Narrative order kept: problem → lens → payoff.
          gsap.set(afterEl, { clipPath: "circle(0% at 50% 50%)" });
          gsap.set(headingCEl, { yPercent: 110, autoAlpha: 0 });
          gsap.set(headingBEl, { yPercent: 110, autoAlpha: 0 });
          gsap.set(chipEls, { opacity: 0, y: 12 });

          const sceneTl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: desktop
              ? {
                  trigger: rootEl,
                  start: "top top",
                  // Longer scrub per user feedback: the scene should take its
                  // time (~140vh, was 100%).
                  end: "+=140%",
                  pin: true,
                  pinSpacing: true,
                  scrub: true,
                  anticipatePin: 1,
                  invalidateOnRefresh: true,
                  // No snap: captured page motion mid-pin read as
                  // "auto scrolling" — removed per user feedback.
                }
              : {
                  trigger: rootEl,
                  start: "top 75%",
                  end: "top 10%",
                  scrub: true,
                },
          });

          // Gentle drift toward the swirl cluster as the user scrolls in.
          sceneTl
            // The plate stays alive through the WHOLE pin: one continuous
            // scrubbed push-in plus a lateral glide (camera gliding right
            // over the swirl cluster), so there is never a frozen moment.
            .to(zoomEl, { scale: 1.2, xPercent: -2.5, duration: 1 }, 0)
            // 1) Problem first, then it holds over the swirled paint.
            .to(headingAEl, { yPercent: -110, duration: 0.1, ease: "power3.in" }, 0.32)
            .to(headingCEl, { yPercent: 0, autoAlpha: 1, duration: 0.1, ease: "power3.out" }, 0.4)
            // 2) The lens expands from the center; swirls inside it give way.
            .to(afterEl, { clipPath: "circle(75% at 50% 50%)", duration: 0.32, ease: "power2.inOut" }, 0.5)
            // 3) Once the clean paint takes over, the payoff headline arrives.
            .to(headingCEl, { yPercent: -110, duration: 0.08, ease: "power3.in" }, 0.74)
            .to(headingBEl, { yPercent: 0, autoAlpha: 1, duration: 0.1, ease: "power3.out" }, 0.8)
            .to(chipEls, { opacity: 1, y: 0, duration: 0.1 }, 0.88);

          return undefined;
        },
      );

      return () => mm.revert();
    }, rootEl);

    return () => ctx.revert();
  }, []);

  const copy = site.copy.macro;
  const { before, after } = site.images.macro;

  return (
    <section
      id="macro"
      data-section="macro"
      aria-label={site.sections.macroReveal.label}
      ref={root}
      className="relative bg-background"
    >
      <div
        ref={stage}
        className="stage-full stage-mobile-short relative w-full overflow-hidden"
      >
        {/* Both plates share one zoom wrapper so the wipe stays aligned. */}
        <div
          ref={zoom}
          className="absolute inset-0 will-change-transform"
          style={{ transformOrigin: "62% 42%" }}
        >
          <div className="absolute inset-0">
            <Image
              src={before.src}
              alt={before.alt}
              fill
              quality={80}
              sizes="100vw"
              className="object-cover"
            />
          </div>

          <div
            ref={afterLayer}
            className="absolute inset-0 [clip-path:circle(0%_at_50%_50%)] motion-reduce:[clip-path:circle(75%_at_50%_50%)]"
            >
            <Image
              src={after.src}
              alt={after.alt}
              fill
              quality={80}
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* Scrims keep the headline legible over the macro plate, and the top
            one melts the seam coming from the wash scene — no hard cut. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-gradient-to-b from-background via-background/35 to-transparent max-md:h-24"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-background/90 via-background/40 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/3 bg-gradient-to-t from-background/95 via-background/45 to-transparent"
        />

        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-end">
          <div className="container-site w-full pb-14 md:pb-20">
            <h2 className="grid text-display text-ink">
              <span className="block overflow-hidden pb-[0.06em] [grid-area:1/1]">
                <span ref={headingA} className="block motion-reduce:opacity-0">
                  {copy.headline}
                </span>
              </span>

              <span className="block overflow-hidden pb-[0.06em] [grid-area:1/1]">
                <span
                  ref={headingC}
                  className="block opacity-0 motion-reduce:opacity-0"
                >
                  {copy.problem}
                </span>
              </span>

              <span className="block overflow-hidden pb-[0.06em] [grid-area:1/1]">
                <span
                  ref={headingB}
                  className="block opacity-0 motion-reduce:opacity-100"
                >
                  {copy.swapLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </span>
            </h2>

            <div className="mt-7 flex flex-wrap gap-2.5 md:mt-9">
              {copy.chips.map((chip, index) => (
                <span
                  key={chip}
                  ref={(el) => {
                    chips.current[index] = el;
                  }}
                  className="rounded-full border border-line bg-background/55 px-4 py-2 text-[11px] uppercase tracking-eyebrow text-ink/80 opacity-0 motion-reduce:opacity-100 max-[768px]:text-sm"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reduced-motion comparison control */}
      <div className="container-site hidden pb-16 pt-8 motion-reduce:block">
        <div className="flex w-full max-w-md flex-col gap-3">
          <label htmlFor="macro-reveal" className="text-eyebrow text-muted">
            {copy.sliderLabel}
          </label>
          <input
            id="macro-reveal"
            ref={slider}
            type="range"
            min={0}
            max={75}
            step={1}
            defaultValue={75}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-accent"
          />
        </div>
      </div>
    </section>
  );
}
