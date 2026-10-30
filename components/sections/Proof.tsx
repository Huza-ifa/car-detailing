"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  gsap,
  MOBILE_QUERY,
  MOTION_QUERY,
  prefersReducedMotion,
  ScrollTrigger,
} from "@/lib/gsap";
import { site } from "@/config/site";
import { detectLowPerf } from "@/lib/perf";

/**
 * 06 — Proof
 *
 * Three parallax layers at different scroll speeds (no pinning, no scroll
 * lock): the proof-bg plate (slowest), the before/after card row (middle),
 * and the count-up stat numerals (front, fastest). The stat counters replay
 * on every viewport entry (either direction) and reset to 0 when the band
 * fully leaves. Each card is a draggable
 * before/after comparison (pointer events, touch-friendly, keyboard slider)
 * with a 4/3 cover crop. Testimonials rotate every 4s with a short
 * crossfade. Desktop-with-mouse gets a ≤4° card tilt and a small background
 * shift; touch devices and reduced motion skip the tilt/parallax/count-up
 * and render the static end state.
 */

/** Rotation interval for the testimonial crossfade, ms. */
const ROTATE_MS = 4000;

export default function Proof() {
  const root = useRef<HTMLElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLDivElement>(null);
  const stats = useRef<HTMLDivElement>(null);
  const statNums = useRef<(HTMLSpanElement | null)[]>([]);
  const quoteBox = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);

  const copy = site.copy.proof;
  const reviews = site.reviews.slice(0, 3);
  const review = reviews[reviewIdx];

  useEffect(() => {
    const rootEl = root.current;
    const bgEl = bg.current;
    const cardsEl = cards.current;
    const statsEl = stats.current;
    if (!rootEl || !bgEl || !cardsEl || !statsEl) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: `(min-width: 769px) and ${MOTION_QUERY}`,
          mobile: `${MOBILE_QUERY} and ${MOTION_QUERY}`,
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { desktop, reduced } = context.conditions ?? {};

          // Simple entry reveals — once, no pin.
          if (reduced) {
            gsap.set("[data-reveal]", { opacity: 1, y: 0 });
            return;
          }

          gsap.from("[data-reveal]", {
            opacity: 0,
            y: desktop ? 48 : 24,
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: rootEl, start: "top 70%", once: true },
          });

          // Three parallax speeds: bg slowest, cards middle, stats front.
          // Pure decoration — skipped on devices that fail the ~40fps probe
          // (the lighter mode); content itself is never gated.
          void detectLowPerf().then((lowPerf) => {
            if (lowPerf) return;
            context.add(() => {
              gsap.fromTo(
                bgEl,
                { yPercent: -7 },
                {
                  yPercent: 8,
                  ease: "none",
                  scrollTrigger: {
                    trigger: rootEl,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                  },
                },
              );
              gsap.fromTo(
                cardsEl,
                { yPercent: 5 },
                {
                  yPercent: -5,
                  ease: "none",
                  scrollTrigger: {
                    trigger: rootEl,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                  },
                },
              );
              gsap.fromTo(
                statsEl,
                { yPercent: 14 },
                {
                  yPercent: -14,
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

          // Stat counters replay on every entry — either direction — and
          // reset to 0 when the band fully leaves. Killing the running
          // tweens first keeps fast re-scrolls from stacking count-ups.
          const counterTweens: gsap.core.Tween[] = [];
          const setStat = (i: number, v: number) => {
            const el = statNums.current[i];
            if (el) el.textContent = v.toFixed(copy.stats[i].decimals ?? 0);
          };
          const resetCounters = () => {
            counterTweens.forEach((tween) => tween.kill());
            counterTweens.length = 0;
            copy.stats.forEach((_, i) => setStat(i, 0));
          };
          const runCounters = () => {
            counterTweens.forEach((tween) => tween.kill());
            counterTweens.length = 0;
            copy.stats.forEach((stat, i) => {
              const counter = { v: 0 };
              counterTweens.push(
                gsap.to(counter, {
                  v: stat.value,
                  duration: 1.6,
                  ease: "power2.out",
                  delay: i * 0.15,
                  onUpdate: () => setStat(i, counter.v),
                }),
              );
            });
          };

          ScrollTrigger.create({
            trigger: statsEl,
            start: "top 85%",
            end: "bottom 20%",
            onEnter: runCounters,
            onEnterBack: runCounters,
            onLeave: resetCounters,
            onLeaveBack: resetCounters,
          });

          // Desktop-with-mouse only (hover AND fine pointer — not touch):
          // ≤4° card tilt + small background shift.
          if (
            window.matchMedia("(hover: hover) and (pointer: fine)").matches
          ) {
            const cardAnims: Array<{
              el: HTMLDivElement;
              rx: (v: number) => void;
              ry: (v: number) => void;
            }> = [];

            cardEls.current.forEach((cardEl) => {
              if (!cardEl) return;
              gsap.set(cardEl, { transformPerspective: 700 });
              cardAnims.push({
                el: cardEl,
                rx: gsap.quickTo(cardEl, "rotationX", {
                  duration: 0.5,
                  ease: "power3.out",
                }),
                ry: gsap.quickTo(cardEl, "rotationY", {
                  duration: 0.5,
                  ease: "power3.out",
                }),
              });
            });

            const onCardMove = (event: PointerEvent) => {
              const found = cardAnims.find((a) => a.el === event.currentTarget);
              if (!found) return;
              const rect = found.el.getBoundingClientRect();
              const relX = (event.clientX - rect.left) / rect.width - 0.5;
              const relY = (event.clientY - rect.top) / rect.height - 0.5;
              found.ry(gsap.utils.clamp(-4, 4, relX * 8));
              found.rx(gsap.utils.clamp(-4, 4, -relY * 8));
            };
            const onCardLeave = (event: PointerEvent) => {
              const found = cardAnims.find((a) => a.el === event.currentTarget);
              if (!found) return;
              found.rx(0);
              found.ry(0);
            };
            cardAnims.forEach(({ el }) => {
              el.addEventListener("pointermove", onCardMove);
              el.addEventListener("pointerleave", onCardLeave);
            });

            const bgRx = gsap.quickTo(bgEl, "x", {
              duration: 0.9,
              ease: "power3.out",
            });
            const onSectionMove = (event: PointerEvent) => {
              const rect = rootEl.getBoundingClientRect();
              bgRx(
                gsap.utils.clamp(
                  -8,
                  8,
                  -((event.clientX - rect.left) / rect.width - 0.5) * 16,
                ),
              );
            };

            rootEl.addEventListener("pointermove", onSectionMove);
            return () => {
              rootEl.removeEventListener("pointermove", onSectionMove);
              cardAnims.forEach(({ el }) => {
                el.removeEventListener("pointermove", onCardMove);
                el.removeEventListener("pointerleave", onCardLeave);
              });
              gsap.killTweensOf(bgEl, "x");
              gsap.set(bgEl, { x: 0 });
            };
          }
        },
      );

      return () => mm.revert();
    }, rootEl);

    return () => ctx.revert();
  }, [copy.stats]);

  // Testimonial rotation — static for reduced motion, paused off-screen.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const box = quoteBox.current;
    if (!box) return;

    const rotate = () => {
      gsap
        .timeline()
        .to(box, { autoAlpha: 0, y: -8, duration: 0.25, ease: "power2.in" })
        .add(() => setReviewIdx((i) => (i + 1) % reviews.length))
        .fromTo(
          box,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" },
        );
    };
    let id: number | undefined;
    const start = () => {
      if (id === undefined) id = window.setInterval(rotate, ROTATE_MS);
    };
    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.2 },
    );
    io.observe(box);

    return () => {
      stop();
      io.disconnect();
    };
  }, [reviews.length]);

  return (
    <section
      id="proof"
      data-section="proof"
      aria-label={site.sections.proof.label}
      ref={root}
      className="section-shell relative overflow-hidden bg-background"
    >
      {/* Layer 1 — background plate (slowest). */}
      <div ref={bg} className="absolute inset-y-[-8%] inset-x-0">
        <Image
          src={site.images.proof.bg.src}
          alt={site.images.proof.bg.alt}
          fill
          sizes="100vw"
          className="h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-background/55"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-background to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-background/85 to-transparent"
      />

      <div className="container-site relative z-20 py-24 md:py-32 lg:py-40">
        <h2 className="text-display text-ink">
          {copy.headline.map((line) => (
            <span key={line} data-reveal className="block">
              {line}
            </span>
          ))}
        </h2>

        {/* Layer 3 — floating stat numerals (front, fastest). */}
        <div
          ref={stats}
          data-reveal
          className="mt-14 flex flex-wrap gap-x-14 gap-y-8 md:mt-20 lg:gap-x-24"
        >
          {copy.stats.map((stat, i) => (
            <div key={stat.label}>
              <p className="font-display text-[clamp(2.75rem,6.5vw,5.5rem)] leading-none text-accent">
                <span
                  ref={(el) => {
                    statNums.current[i] = el;
                  }}
                >
                  {stat.value.toFixed(stat.decimals ?? 0)}
                </span>
                <span aria-hidden="true">{stat.suffix}</span>
              </p>
              <p className="text-eyebrow mt-3 text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Layer 2 — before/after card row (middle). */}
        <div
          ref={cards}
          data-reveal
          className="mt-16 grid gap-6 md:mt-24 md:grid-cols-2"
        >
          {site.images.proof.cards.map((card, i) => (
            <BeforeAfterCard
              key={card.id}
              card={card}
              comparisonLabel={copy.comparisonLabel}
              registerEl={(el) => {
                cardEls.current[i] = el;
              }}
            />
          ))}
        </div>

        {/* Rotating testimonials. */}
        <div data-reveal className="mt-16 max-w-2xl md:mt-24">
          <div ref={quoteBox}>
            <p className="text-lg leading-relaxed text-ink md:text-xl">
              &ldquo;{review.quote}&rdquo;
            </p>
            <p className="text-eyebrow mt-6 text-muted">
              {review.name} · {review.vehicle} ·{" "}
              <span className="text-accent" aria-hidden="true">
                {"★".repeat(review.rating)}
              </span>
              <span className="sr-only">Rated {review.rating} of 5</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Draggable before/after comparison — pointer events, touch, keyboard. */
function BeforeAfterCard({
  card,
  comparisonLabel,
  registerEl,
}: {
  card: (typeof site.images.proof.cards)[number];
  comparisonLabel: string;
  registerEl: (el: HTMLDivElement | null) => void;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const afterLayer = useRef<HTMLDivElement>(null);
  const divider = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const pos = useRef(55);

  useEffect(() => {
    const wrapEl = wrap.current;
    const afterEl = afterLayer.current;
    const dividerEl = divider.current;
    const handleEl = handle.current;
    if (!wrapEl || !afterEl || !dividerEl || !handleEl) return;

    const apply = () => {
      // After-photo layer is clipped from the right — everything left of
      // the divider shows the finish.
      afterEl.style.clipPath = `inset(0 ${100 - pos.current}% 0 0)`;
      dividerEl.style.left = `${pos.current}%`;
      handleEl.style.left = `${pos.current}%`;
      handleEl.setAttribute("aria-valuenow", String(Math.round(pos.current)));
      handleEl.setAttribute(
        "aria-valuetext",
        `${Math.round(pos.current)}% after`,
      );
    };
    apply();

    const setFromPointer = (event: PointerEvent) => {
      const rect = wrapEl.getBoundingClientRect();
      pos.current = Math.min(
        98,
        Math.max(2, ((event.clientX - rect.left) / rect.width) * 100),
      );
      apply();
    };
    const onMove = (event: PointerEvent) => setFromPointer(event);
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      // Promote the clip layer only while dragging (cheap compositing).
      afterEl.style.willChange = "clip-path";
      // Capture keeps the drag alive if the pointer leaves the card; if the
      // pointer is already gone (or the event is synthetic) fall back to
      // plain move handling on the card.
      try {
        wrapEl.setPointerCapture(event.pointerId);
      } catch {
        /* no active pointer — drag still works while over the card */
      }
      setFromPointer(event);
      wrapEl.addEventListener("pointermove", onMove);
      wrapEl.addEventListener("pointerup", onUp);
      wrapEl.addEventListener("pointercancel", onUp);
    };
    const onUp = () => {
      afterEl.style.willChange = "";
      wrapEl.removeEventListener("pointermove", onMove);
      wrapEl.removeEventListener("pointerup", onUp);
      wrapEl.removeEventListener("pointercancel", onUp);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      pos.current = Math.min(
        98,
        Math.max(2, pos.current + (event.key === "ArrowRight" ? 4 : -4)),
      );
      apply();
    };

    wrapEl.addEventListener("pointerdown", onDown);
    handleEl.addEventListener("keydown", onKey);
    return () => {
      wrapEl.removeEventListener("pointerdown", onDown);
      handleEl.removeEventListener("keydown", onKey);
      onUp();
    };
  }, []);

  return (
    <figure className="flex flex-col">
      <div
        ref={(el) => {
          registerEl(el);
          wrap.current = el;
        }}
        className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-sm border border-line bg-surface [cursor:ew-resize] [touch-action:pan-y]"
      >
        <Image
          src={card.before.src}
          alt={card.before.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
        <div ref={afterLayer} className="absolute inset-0">
          <Image
            src={card.after.src}
            alt={card.after.alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        {/* divider + drag handle */}
        <div
          ref={divider}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-white/80"
          style={{ left: "55%" }}
        />
        <button
          type="button"
          ref={handle}
          role="slider"
          aria-label={`${comparisonLabel} — ${card.label}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={55}
          aria-valuetext={`${Math.round(pos.current)}% after`}
          className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-background/85 text-ink shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
          style={{ left: "55%" }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M9 6 4.5 12 9 18M15 6l4.5 6L15 18" />
          </svg>
        </button>

        <span className="text-eyebrow pointer-events-none absolute left-4 top-4 rounded-full bg-background/70 px-3 py-1.5 text-ink/80">
          {card.label}
        </span>
      </div>
      <figcaption className="text-eyebrow mt-3 text-muted">
        {card.label} — {comparisonLabel}
      </figcaption>
    </figure>
  );
}
