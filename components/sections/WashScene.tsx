"use client";

import { useEffect, useRef } from "react";
import { gsap, MOBILE_QUERY, MOTION_QUERY, REDUCED_MOTION_QUERY, ScrollTrigger } from "@/lib/gsap";
import { site } from "@/config/site";
import GrainOverlay from "@/components/ui/GrainOverlay";
import type { ParticleEngine } from "@/lib/washParticles";
import { detectLowPerf, isLowPerf } from "@/lib/perf";

export default function WashScene() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLImageElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const meterFill = useRef<HTMLDivElement>(null);
  const meterValue = useRef<HTMLSpanElement>(null);
  const slider = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    const stageEl = stage.current;
    const frameEl = frame.current;
    const edgeEl = edge.current;
    const canvasEl = canvas.current;
    const meterFillEl = meterFill.current;
    const meterValueEl = meterValue.current;
    const sliderEl = slider.current;
    if (!rootEl || !stageEl || !frameEl || !edgeEl || !canvasEl) return;

    const labelEls = labels.current.filter(Boolean) as HTMLSpanElement[];
    const seq = site.images.washSeq;
    const seqUrl = (base: string, index: number) =>
      `${base}${String(index).padStart(seq.pad, "0")}.${seq.ext}`;

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

          // Frame set per breakpoint: desktop 40 / mobile 24, never upscaled.
          const base = desktop ? seq.desktopPath : seq.mobilePath;
          const count = desktop ? seq.desktopCount : seq.mobileCount;

          // --- frame preloading (sequential, background; never blocks) ---------
          let aborted = false;
          const preloaded: number[] = [];
          const preload = async (indices: number[]) => {
            for (const i of indices) {
              if (aborted) return;
              try {
                const img = new Image();
                img.decoding = "async";
                img.src = seqUrl(base, i);
                await img.decode();
                preloaded.push(i);
              } catch {
                /* keep scrubbing with whatever is cached */
              }
            }
          };

          if (reduced) {
            // Static final frame; the slider scrubs the sequence in place.
            let current = 0;
            frameEl.decoding = "async";
            frameEl.src = seqUrl(base, count);
            current = count;

            const onSliderInput = (event: Event) => {
              const value = Number((event.currentTarget as HTMLInputElement).value);
              const idx = gsap.utils.clamp(1, count, 1 + Math.round((value / 100) * (count - 1)));
              if (idx !== current) {
                frameEl.decoding = "async";
                frameEl.src = seqUrl(base, idx);
                current = idx;
              }
            };

            sliderEl?.addEventListener("input", onSliderInput);

            return () => {
              aborted = true;
              sliderEl?.removeEventListener("input", onSliderInput);
            };
          }

          const setEdgeX = gsap.quickSetter(edgeEl, "x", "px") as (
            value: number,
          ) => void;
          const setMeterFill = meterFillEl
            ? (gsap.quickSetter(meterFillEl, "scaleX") as (value: number) => void)
            : null;

          // Stage width cache for the sweep line's transform — kept off the
          // render hot path (same pattern as the coating scene).
          let stageW = stageEl.clientWidth;
          const stageRO = new ResizeObserver(() => {
            stageW = stageEl.clientWidth;
          });
          stageRO.observe(stageEl);

          // Initial preload: first frame + a small ramp; rest in background.
          frameEl.decoding = "async";
          frameEl.src = seqUrl(base, 1);
          void preload([1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]);

          let engine: ParticleEngine | null = null;
          let particlesActive = false;
          let disposed = false;

          if (desktop) {
            import("@/lib/washParticles")
              .then(({ createWashParticles }) => {
                if (disposed) return;
                // Lighter pools on smaller/low-power devices (~15 mobile / 40 max).
                const cap =
                  window.innerWidth <= 768
                    ? 15
                    : window.innerWidth <= 1024
                      ? 28
                      : 40;
                engine = createWashParticles(canvasEl, stageEl, cap);
                if (particlesActive && !isLowPerf()) engine.start();
              })
              .catch(() => undefined);

            // Particles only run while the stage is on screen — and never in
            // the low-perf lighter mode (they are pure decoration).
            ScrollTrigger.create({
              trigger: stageEl,
              start: "top bottom",
              end: "bottom top",
              onToggle: (self) => {
                particlesActive = self.isActive;
                if (self.isActive && !isLowPerf()) engine?.start();
                else engine?.stop();
              },
            });
          }

          // Preload the rest of the sequence only once we are near the
          // viewport — never on page load (both breakpoints). Scrolling far
          // past cancels the queue; re-entering resumes whatever is left.
          const remaining = () =>
            Array.from({ length: count }, (_, k) => k + 1).filter(
              (i) => !preloaded.includes(i),
            );
          let restInView = false;
          const restIO = new IntersectionObserver(
            (entries) => {
              const visible = entries.some((entry) => entry.isIntersecting);
              if (visible === restInView) return;
              restInView = visible;
              if (visible) {
                aborted = false;
                void preload(remaining());
              } else {
                // Far past the ~1.5-screen margin — stop feeding the queue.
                aborted = true;
              }
            },
            { rootMargin: "150% 0px" },
          );
          restIO.observe(stageEl);

          // Initial label state: first label visible, the rest stacked away.
          labelEls.forEach((label, index) => {
            gsap.set(label, { autoAlpha: index === 0 ? 1 : 0, y: index === 0 ? 0 : 14 });
          });

          let currentLabel = 0;
          const swapLabel = (next: number) => {
            const from = labelEls[currentLabel];
            const to = labelEls[next];
            currentLabel = next;
            gsap.to(from, { autoAlpha: 0, y: -14, duration: 0.22, overwrite: "auto" });
            gsap.to(to, { autoAlpha: 1, y: 0, duration: 0.24, overwrite: "auto" });
          };

          const copy = site.copy.wash;
          const state = { progress: 0 };
          let lastProgress = 0;
          let currentFrame = -1;
          let lastMeterPct = -1;

          // ONE render function — frame index, sweep line, meter and labels all
          // derive from the same progress value in the same update.
          const render = (p: number) => {
            const idx = gsap.utils.clamp(1, count, 1 + Math.floor(p * count));
            if (idx !== currentFrame) {
              currentFrame = idx;
              frameEl.decoding = "async";
              frameEl.src = seqUrl(base, idx);
            }

            setEdgeX(p * stageW);
            setMeterFill?.(p);
            const meterPct = Math.round(p * 100);
            if (meterPct !== lastMeterPct) {
              lastMeterPct = meterPct;
              if (meterValueEl) {
                meterValueEl.textContent = `${meterPct}${copy.meterUnit}`;
              }
            }

            engine?.emitAlongEdge(p, Math.abs(p - lastProgress) * 100);
            lastProgress = p;

            const target = p < 0.5 ? 0 : p < 0.95 ? 1 : 2;
            if (target !== currentLabel) swapLabel(target);
          };

          gsap.to(state, {
            progress: 1,
            ease: "none",
            duration: 1,
            scrollTrigger: {
              trigger: rootEl,
              start: "top top",
              // Longer scrub per user feedback: the wash should linger
              // (~190vh desktop). Mobile uses ~100svh — short enough to keep
              // the page moving on a phone.
              end: desktop ? "+=190%" : "+=100%",
              pin: true,
              pinSpacing: true,
              scrub: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              // No snap: page motion on its own mid-pin read as "auto
              // scrolling" — removed per user feedback.
            },
            onUpdate: () => render(state.progress),
          });

          // Seam drift: the frame plate breathes with the scroll while the
          // stage is on screen (11% overscan keeps the plate covered).
          // Decorative — skipped in the low-perf lighter mode.
          void detectLowPerf().then((lowPerf) => {
            if (lowPerf) return;
            context.add(() => {
              gsap.fromTo(
                frameEl,
                { yPercent: -4 },
                {
                  yPercent: 4,
                  ease: "none",
                  scrollTrigger: {
                    trigger: rootEl,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                  },
                },
              );
            });
          });

          render(0);

          return () => {
            disposed = true;
            aborted = true;
            restIO.disconnect();
            stageRO.disconnect();
            engine?.destroy();
            engine = null;
          };
        },
      );

      return () => mm.revert();
    }, rootEl);

    return () => ctx.revert();
  }, []);

  const seq = site.images.washSeq;
  const copy = site.copy.wash;
  const stageLabels = [copy.initial, copy.mid, copy.done];
  const firstFrame = `${seq.desktopPath}${"1".padStart(seq.pad, "0")}.${seq.ext}`;

  return (
    <section
      id="wash"
      data-section="wash"
      aria-label={site.sections.washScene.label}
      ref={root}
      className="relative bg-background [--car-focus:50%_50%]"
    >
      {/* Page h1 lives on the hero wash (visually hidden — the stage copy
          stays the scrub labels, design unchanged). */}
      <h1 className="sr-only">{site.seo.title}</h1>
      <div
        ref={stage}
        className="stage-full relative w-full overflow-hidden"
      >
        {/* wash sequence frame (scrubbed by scroll / slider) */}
        {/* eslint-disable-next-line @next/next/no-img-element -- frame-scrub sprite; per-frame next/image optimization adds nothing (AGENTS.md §7) */}
        <img
          ref={frame}
          src={firstFrame}
          alt=""
          decoding="async"
          width={seq.width}
          height={seq.height}
          className="absolute left-0 top-[-6%] h-[112%] w-full object-cover"
          style={{
            objectPosition: `var(--car-focus, ${(seq.focus.x * 100).toFixed(0)}% ${(
              seq.focus.y * 100
            ).toFixed(0)}%)`,
          }}
        />

        {/* Seam blend into the next scene starts here — gradient, no hard cut. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-36 bg-gradient-to-b from-background via-background/35 to-transparent max-md:h-24" />

      {/* cyan light sweep — x transform driven by the shared progress value */}
        <div
          ref={edge}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-20 motion-reduce:hidden"
        >
          <span className="absolute left-0 top-0 h-full w-[2px] -translate-x-1/2 bg-gradient-to-b from-white/90 via-accent to-accent/60 shadow-[0_0_18px_rgba(34,211,238,0.9),0_0_56px_rgba(34,211,238,0.4)]" />
          <span className="absolute left-[2px] top-0 h-full w-[140px] bg-gradient-to-r from-accent/20 via-accent/10 to-transparent" />
        </div>

        {/* foam / sparkle particles, near the sweep line only */}
        <canvas
          ref={canvas}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 h-full w-full max-[768px]:hidden motion-reduce:hidden"
        />

        {/* max 8% black at the very bottom, for the meter text only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-background/75 to-transparent"
        />

        <GrainOverlay />

        {/* stage copy, lower right */}
        <div className="pointer-events-none absolute bottom-24 right-6 z-40 text-right md:bottom-32 md:right-16">
          <p className="grid motion-reduce:hidden" aria-hidden="true">
            {stageLabels.map((label, index) => (
              <span
                key={label}
                ref={(el) => {
                  labels.current[index] = el;
                }}
                className="invisible justify-self-end whitespace-nowrap font-display text-[clamp(2.75rem,7vw,6.5rem)] uppercase leading-none tracking-tight text-ink [grid-area:1/1]"
              >
                {label}
              </span>
            ))}
          </p>
          <p className="hidden font-display text-[clamp(2.75rem,7vw,5rem)] uppercase leading-none tracking-tight text-ink motion-reduce:block">
            {copy.beforeAfter}
          </p>
        </div>

        {/* progress meter */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 left-1/2 z-40 flex w-52 -translate-x-1/2 flex-col gap-2 motion-reduce:hidden md:w-44"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-eyebrow text-muted">{copy.meterLabel}</span>
            <span ref={meterValue} className="font-display text-base leading-none text-accent">
              {`0${copy.meterUnit}`}
            </span>
          </div>
          <div className="relative h-px w-full bg-line">
            <div ref={meterFill} className="absolute inset-0 origin-left scale-x-0 bg-accent" />
          </div>
        </div>
      </div>

      {/* reduced-motion control — scrubs the frame sequence by hand */}
      <div className="container-site hidden pb-24 pt-10 motion-reduce:block">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <label htmlFor="wash-wipe" className="text-eyebrow text-muted">
            {copy.sliderLabel}
          </label>
          <input
            id="wash-wipe"
            ref={slider}
            type="range"
            min={0}
            max={100}
            step={1}
            defaultValue={100}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-accent"
          />
        </div>
      </div>
    </section>
  );
}
