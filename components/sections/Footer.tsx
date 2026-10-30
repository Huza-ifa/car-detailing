"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap, MOBILE_QUERY, MOTION_QUERY } from "@/lib/gsap";
import { site } from "@/config/site";
import { detectLowPerf } from "@/lib/perf";

/**
 * 07 — Footer / Contact
 *
 * Full-bleed backdrop with slow parallax (dark-gradient placeholder until a
 * footer photo exists), a closing statement where the backdrop breathing
 * band used to be, a contact block that slides up over the image like a
 * curtain (translate parallax), and a very large outlined brand name cropped
 * at the bottom edge with a slow CSS light sweep every 6 seconds
 * (background-position only, collapsed under reduced motion). No
 * backdrop-filter, no scroll lock, no pinning. Booking flows through the
 * Payoff CTA and the navbar (→ here) until the booking drawer ships.
 */
export default function Footer() {
  const root = useRef<HTMLElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const curtain = useRef<HTMLDivElement>(null);
  const statement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    const bgEl = bg.current;
    const curtainEl = curtain.current;
    const statementEl = statement.current;
    if (!rootEl || !bgEl || !curtainEl || !statementEl) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: `(min-width: 769px) and ${MOTION_QUERY}`,
          mobile: `${MOBILE_QUERY} and ${MOTION_QUERY}`,
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { reduced } = context.conditions ?? {};
          if (reduced) return; // static: no parallax, no curtain travel

          // Slow backdrop drift. Pure decoration — skipped in the low-perf
          // lighter mode; the curtain reveal below always runs.
          void detectLowPerf().then((lowPerf) => {
            if (lowPerf) return;
            context.add(() => {
              gsap.fromTo(
                bgEl,
                { yPercent: -6 },
                {
                  yPercent: 7,
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

          // Curtain: the contact block rides up over the image as it enters.
          gsap.fromTo(
            curtainEl,
            { yPercent: 22 },
            {
              yPercent: 0,
              ease: "none",
              scrollTrigger: {
                trigger: curtainEl,
                start: "top bottom",
                end: "top 60%",
                scrub: true,
              },
            },
          );

          // Closing statement — one soft reveal when it enters.
          gsap.from(statementEl, {
            autoAlpha: 0,
            y: 28,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: statementEl, start: "top 85%", once: true },
          });

          // Desktop-only micro response of the backdrop to the pointer.
          if (
            window.matchMedia("(hover: hover) and (pointer: fine)").matches
          ) {
            const bgTo = gsap.quickTo(bgEl, "x", {
              duration: 0.9,
              ease: "power3.out",
            });
            const onMove = (event: PointerEvent) => {
              const rect = rootEl.getBoundingClientRect();
              bgTo(
                gsap.utils.clamp(
                  -8,
                  8,
                  -((event.clientX - rect.left) / rect.width - 0.5) * 14,
                ),
              );
            };
            rootEl.addEventListener("pointermove", onMove);
            return () => {
              rootEl.removeEventListener("pointermove", onMove);
              gsap.killTweensOf(bgEl, "x");
              gsap.set(bgEl, { x: 0 });
            };
          }
        },
      );

      return () => mm.revert();
    }, rootEl);

    return () => ctx.revert();
  }, []);

  const copy = site.copy.footer;
  const contact = site.contact;

  return (
    <footer
      id="contact"
      data-section="contact"
      aria-label={site.sections.footer.label}
      ref={root}
      className="section-shell relative overflow-hidden bg-background"
    >
      {/* backdrop — photo or dark-gradient placeholder, slowest layer */}
      <div ref={bg} className="absolute inset-y-[-7%] inset-x-0">
        {site.images.footer.bg ? (
          <Image
            src={site.images.footer.bg.src}
            alt={site.images.footer.bg.alt}
            fill
            sizes="100vw"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-full w-full bg-[radial-gradient(120%_90%_at_20%_10%,rgba(34,211,238,0.10),transparent_55%),radial-gradient(100%_80%_at_85%_90%,rgba(232,236,241,0.06),transparent_60%),linear-gradient(180deg,#07090c_10%,#0e1217_60%,#07090c_100%)]"
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-background/45" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-background to-transparent"
      />

      {/* closing statement — fills the backdrop beat above the curtain */}
      <div className="relative z-20">
        <div ref={statement} className="container-site py-16 md:py-24">
          <p className="text-eyebrow text-muted">{copy.eyebrow}</p>
          <p className="text-display text-balance mt-5 max-w-[12ch] text-ink md:mt-6">
            {copy.headline}
          </p>
        </div>
      </div>

      {/* curtain contact block — rides up over the image */}
      <div
        ref={curtain}
        className="relative z-20 border-t border-line bg-surface"
      >
        <div className="container-site grid gap-10 py-14 md:grid-cols-3 md:py-20">
          <div>
            <p className="text-eyebrow text-muted">Visit</p>
            <p className="mt-4 text-base leading-relaxed text-ink">
              {contact.address.street}
              <br />
              {contact.address.city}, {contact.address.region}{" "}
              {contact.address.postalCode}
            </p>
          </div>
          <div>
            <p className="text-eyebrow text-muted">Hours</p>
            <dl className="mt-4 space-y-2">
              {contact.hours.map((row) => (
                <div key={row.days} className="flex justify-between gap-6">
                  <dt className="text-muted">{row.days}</dt>
                  <dd className="text-ink">{row.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="text-eyebrow text-muted">Contact</p>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  href={contact.phoneHref}
                  className="inline-flex min-h-[44px] items-center text-ink transition hover:text-accent active:text-accent"
                >
                  {contact.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex min-h-[44px] items-center text-ink transition hover:text-accent active:text-accent"
                >
                  {contact.email}
                </a>
              </li>
              <li>
                <a
                  href={contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center text-ink transition hover:text-accent active:text-accent"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="container-site border-t border-line py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <p className="text-[11px] uppercase tracking-eyebrow text-muted max-[768px]:text-sm">
            {copy.legal}
          </p>
        </div>
      </div>

      {/* giant outlined brand, cropped at the bottom edge + 6s sheen */}
      <div
        aria-hidden="true"
        className="relative overflow-hidden border-t border-line bg-surface"
      >
        <p
          className="whitespace-nowrap text-center font-display leading-none tracking-tight"
          style={{ fontSize: "clamp(7rem, 22vw, 26rem)" }}
        >
          <span className="brand-sheen block translate-y-[38%]">
            {site.brand.name}
          </span>
        </p>
      </div>
    </footer>
  );
}
