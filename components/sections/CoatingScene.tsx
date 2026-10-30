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
import { site } from "@/config/site";

/**
 * 05 — Ceramic Coating
 *
 * SCRUBBED canvas frame sequence (same grammar as the wash scene): the
 * section pins at "top top" (~150vh desktop / ~120vh mobile, no snap) and a
 * scroll-driven progress tween scrubs the coating wipe. ONE render function
 * derives everything from the same progress value — frame index (drawn on a
 * DPR-capped canvas only when the index changes), the cyan sweep line, the
 * progress meter, the "SEALED. SHINE LOCKED IN." label swap at ~60% and the
 * finish chips at ~80%. No scroll lock, no triggered play: scrubbing back
 * un-seals it.
 *
 * The sweep line does NOT run on raw scroll progress: it follows the
 * measured wipe edge for the current frame (public/frames/coating/
 * edge.json — per-frame 0-1 fractions; monotonic + smoothed). The fraction
 * is frame-space, so it is mapped through the canvas cover-fit (scale +
 * centering offset) to get the on-screen position, and SEAL PROGRESS
 * displays the same fraction. The line fades out while the edge is parked
 * at the frame borders (no wipe visible there in the footage).
 *
 * Canvas/decode work lives in the shared player (lib/frameSequence.ts):
 * frames preload sequentially once the scene is NEAR the viewport (never on
 * page load), the first decoded frame paints immediately, mobile decodes to
 * right-sized ImageBitmaps, and rendering pauses off-screen.
 * Reduced motion renders the final frame + end-state copy statically.
 *
 * ?debug=1 draws the measured edge on the canvas (magenta) next to the cyan
 * line so the mapping can be verified against the footage.
 *
 * Frame paths/counters live in /config/site.ts → images.coatingSeq
 * (FFmpeg: assets/coating-wipe.mp4 → public/frames/coating + coating-m,
 * chosen per breakpoint).
 */

type EdgeMap = { desktop: number[]; mobile: number[] };

/** Module-cached so breakpoint switches never refetch the curve. */
let edgeCache: Promise<EdgeMap | null> | null = null;
const loadEdgeMap = (): Promise<EdgeMap | null> => {
  edgeCache ??= fetch("/frames/coating/edge.json")
    .then((res) => (res.ok ? (res.json() as Promise<EdgeMap>) : null))
    .catch(() => null);
  return edgeCache;
};

export default function CoatingScene() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLCanvasElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const headlineA = useRef<HTMLSpanElement>(null);
  const headlineB = useRef<HTMLSpanElement>(null);
  const meterValue = useRef<HTMLSpanElement>(null);
  const meterFill = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const rootEl = root.current;
    const stageEl = stage.current;
    const canvasEl = frame.current;
    const edgeEl = edge.current;
    const headlineAEl = headlineA.current;
    const headlineBEl = headlineB.current;
    const meterValueEl = meterValue.current;
    const meterFillEl = meterFill.current;
    if (
      !rootEl ||
      !stageEl ||
      !canvasEl ||
      !edgeEl ||
      !headlineAEl ||
      !headlineBEl ||
      !meterValueEl ||
      !meterFillEl
    ) {
      return;
    }
    const chipEls = chips.current.filter(Boolean) as HTMLSpanElement[];

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
          // frame sets, shorter pins, mobile edge map. The desktop tier
          // assumes a mouse (hover-capable, fine primary pointer).
          const touch = window.matchMedia(
            "(hover: none), (pointer: coarse)",
          ).matches;
          const desktop = wide && !touch;

          const seq = site.images.coatingSeq;
          const count = desktop ? seq.desktopCount : seq.mobileCount;

          // Measured wipe-edge fractions for the active breakpoint; arrive
          // async and re-render once loaded (wired up below, after render).
          let edges: number[] | null = null;

          const isDebug =
            new URLSearchParams(window.location.search).get("debug") === "1";

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
            reduced,
            // ?debug=1: stroke the measured edge (magenta) on the canvas so
            // it can be checked against the cyan line. Same cover-fit math
            // as the DOM line, in canvas buffer pixels.
            onAfterDraw: isDebug
              ? (idx) => {
                  const f = edges?.[idx];
                  if (f === undefined) return;
                  const ctx = canvasEl.getContext("2d");
                  if (!ctx) return;
                  const fit = Math.max(
                    canvasEl.width / seq.width,
                    canvasEl.height / seq.height,
                  );
                  const x =
                    (canvasEl.width - seq.width * fit) * seq.focus.x +
                    f * seq.width * fit;
                  ctx.save();
                  ctx.strokeStyle = "rgba(255,0,255,0.9)";
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(x, 0);
                  ctx.lineTo(x, canvasEl.height);
                  ctx.stroke();
                  ctx.restore();
                }
              : undefined,
          });

          // Reduced motion: the player paints the final frame and the copy
          // below shows its end state — no pin, no scrub, no preloader.
          if (reduced) return () => player.dispose();

          // --- scrubbed scene (motion allowed) --------------------------------
          let currentLabel = 0;
          const swapLabel = (next: number) => {
            const from = next === 0 ? headlineBEl : headlineAEl;
            const to = next === 0 ? headlineAEl : headlineBEl;
            currentLabel = next;
            gsap.to(from, { autoAlpha: 0, y: -14, duration: 0.22, overwrite: "auto" });
            gsap.to(to, { autoAlpha: 1, y: 0, duration: 0.24, overwrite: "auto" });
          };

          let chipsShown = false;
          const setChips = (show: boolean) => {
            gsap.to(chipEls, {
              autoAlpha: show ? 1 : 0,
              y: show ? 0 : 12,
              duration: 0.35,
              stagger: 0.07,
              ease: "power2.out",
              overwrite: "auto",
            });
          };

          const setEdgeX = gsap.quickSetter(edgeEl, "x", "px") as (
            value: number,
          ) => void;
          const setEdgeAlpha = gsap.quickSetter(edgeEl, "opacity") as (
            value: number,
          ) => void;
          const setMeterFill = gsap.quickSetter(meterFillEl, "scaleX") as (
            value: number,
          ) => void;
          const meterUnit = site.copy.coating.meterUnit;

          // Initial overlay state: first label visible, the rest stacked away.
          gsap.set(headlineBEl, { autoAlpha: 0, y: 14 });
          gsap.set(chipEls, { autoAlpha: 0, y: 12 });

          const state = { progress: 0 };
          let currentFrame = -1;
          let lastMeterPct = -1;

          // ONE render function — frame index, sweep line, meter, label swap
          // and chips all derive from the same progress value in one update.
          const render = (p: number) => {
            const idx = Math.min(count - 1, Math.max(0, Math.floor(p * count)));
            if (idx !== currentFrame) {
              currentFrame = idx;
              player.queueDraw(idx);
            }

            // The line follows the MEASURED wipe edge for this frame — a
            // frame-space fraction — mapped through the canvas cover-fit
            // (scale + centering offset) so the on-screen position matches
            // the footage. Falls back to raw progress until edge.json has
            // arrived. Parked at the frame borders there is no edge to
            // mark, so the line fades in/out there. SEAL PROGRESS reads
            // the SAME value — the meter tracks the wipe edge, not raw
            // scroll.
            const f = edges?.[idx] ?? p;
            const fit = Math.max(stageW / seq.width, stageH / seq.height);
            const drawW = seq.width * fit;
            const drawX = (stageW - drawW) * seq.focus.x;
            setEdgeX(drawX + f * drawW);
            setEdgeAlpha(Math.max(0, Math.min(1, f / 0.04, (1 - f) / 0.04)));
            setMeterFill(f);
            const meterPct = Math.round(f * 100);
            if (meterPct !== lastMeterPct) {
              lastMeterPct = meterPct;
              meterValueEl.textContent = `${meterPct}${meterUnit}`;
            }

            const target = p < 0.6 ? 0 : 1;
            if (target !== currentLabel) swapLabel(target);

            const chipsOn = p > 0.82;
            if (chipsOn !== chipsShown) {
              chipsShown = chipsOn;
              setChips(chipsOn);
            }
          };

          // Stage size cache for the cover-fit mapping — kept off the render
          // hot path; on resize the player redraws and this re-derives the
          // DOM line's mapping.
          let stageW = stageEl.clientWidth;
          let stageH = stageEl.clientHeight;
          const stageRO = new ResizeObserver(() => {
            stageW = stageEl.clientWidth;
            stageH = stageEl.clientHeight;
            render(state.progress);
          });
          stageRO.observe(stageEl);

          // Wire the measured curve in (render + the ?debug=1 hook read it)
          // and snap the overlay once it arrives.
          void loadEdgeMap().then((map) => {
            if (!map) return;
            edges = desktop ? map.desktop : map.mobile;
            render(state.progress);
          });

          gsap.to(state, {
            progress: 1,
            ease: "none",
            duration: 1,
            scrollTrigger: {
              trigger: rootEl,
              start: "top top",
              // Lingering scrub per the wash scene's feel: ~150vh desktop,
              // ~100svh mobile. No snap — page motion on its own mid-pin
              // read as "auto scrolling" (removed per user feedback).
              end: desktop ? "+=150%" : "+=100%",
              pin: true,
              pinSpacing: true,
              // Soft catch-up lag — same feel as the payoff's shared player;
              // eases frame/line stepping without moving the page on its own.
              scrub: 0.5,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
            onUpdate: () => render(state.progress),
          });

          render(0);

          return () => {
            stageRO.disconnect();
            player.dispose();
          };
        },
      );

      return () => mm.revert();
    }, rootEl);

    return () => ctx.revert();
  }, []);

  const copy = site.copy.coating;
  // Frame 1 as a static DOM poster under the canvas — the scene stays
  // visible even if the player can't run on a given machine.
  const posterUrl = `${site.images.coatingSeq.desktopPath}${String(1).padStart(site.images.coatingSeq.pad, "0")}.${site.images.coatingSeq.ext}`;

  return (
    <section
      id="coating"
      data-section="coating"
      aria-label={site.sections.coating.label}
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
          sizes="100vw"
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
        <canvas
          ref={frame}
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full"
        />

        {/* seam melts above and below the plate — no hard cuts */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-gradient-to-b from-background via-background/35 to-transparent max-md:h-24"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-background/75 to-transparent"
        />

        {/* cyan light sweep — x transform driven by the measured edge */}
        <div
          ref={edge}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-20 motion-reduce:hidden"
        >
          <span className="absolute left-0 top-0 h-full w-[2px] -translate-x-1/2 bg-gradient-to-b from-white/90 via-accent to-accent/60 shadow-[0_0_18px_rgba(34,211,238,0.9),0_0_56px_rgba(34,211,238,0.4)]" />
          <span className="absolute left-[2px] top-0 h-full w-[140px] bg-gradient-to-r from-accent/20 via-accent/10 to-transparent" />
        </div>

        {/* stage copy, lower left — label swaps @60%, chips appear @80% */}
        <div className="pointer-events-none absolute bottom-24 left-6 z-40 md:bottom-32 md:left-16">
          <h2 className="grid text-display text-ink">
            <span
              ref={headlineA}
              className="block [grid-area:1/1] motion-reduce:opacity-0"
            >
              {copy.headline}
            </span>
            <span
              ref={headlineB}
              className="block opacity-0 [grid-area:1/1] motion-reduce:opacity-100"
            >
              {copy.sealed}
            </span>
          </h2>

          <div className="mt-7 flex flex-wrap gap-2.5 md:mt-9">
            {copy.chips.map((chipText, index) => (
              <span
                key={chipText}
                ref={(el) => {
                  chips.current[index] = el;
                }}
                className="rounded-full border border-line bg-background/55 px-4 py-2 text-[11px] uppercase tracking-eyebrow text-ink/80 opacity-0 motion-reduce:opacity-100 max-[768px]:text-sm"
              >
                {chipText}
              </span>
            ))}
          </div>
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
    </section>
  );
}
