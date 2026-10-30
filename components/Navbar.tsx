"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type MouseEvent } from "react";
import { useLenis } from "@/components/SmoothScroll";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

const HIDE_AFTER = 72;
const DIRECTION_THRESHOLD = 6;

export default function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();
  const lenis = useLenis();

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      setScrolled(y > 16);

      if (y <= HIDE_AFTER) {
        setHidden(false);
      } else if (Math.abs(delta) > DIRECTION_THRESHOLD) {
        setHidden(delta > 0);
      }

      lastY = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const handleCtaClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const { href } = site.nav.cta;

    if (!lenis || !href.startsWith("#")) return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    setHidden(false);
    lenis.scrollTo(href, {
      offset: -80,
      immediate: Boolean(reduceMotion),
    });
  };

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden && !reduceMotion ? "-100%" : "0%" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onFocusCapture={() => setHidden(false)}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={cn(
          "border-b pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-colors duration-500",
          scrolled || hidden
            ? "border-line bg-background/80"
            : "border-transparent bg-background/20",
        )}
      >
        <nav
          aria-label={site.ui.primaryNav}
          className="mx-auto flex h-16 w-full max-w-site items-center justify-between px-6 md:h-20 md:px-10 lg:px-16"
        >
          <Link
            href="/"
            className="group -my-4 flex items-baseline gap-3 py-4"
          >
            <span className="font-display text-2xl leading-none tracking-[0.04em] text-ink md:text-3xl">
              {site.brand.name}
            </span>
            <span className="hidden border-l border-line pl-3 text-[10px] uppercase tracking-eyebrow text-muted transition-colors duration-300 group-hover:text-ink sm:inline-block max-[768px]:text-sm">
              {site.brand.city}
            </span>
            <span className="sr-only"> {site.ui.homeLink}</span>
          </Link>

          <a
            href={site.nav.cta.href}
            onClick={handleCtaClick}
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[11px] font-medium uppercase tracking-[0.18em] text-background transition-colors duration-300 hover:bg-accent active:bg-accent max-[768px]:text-sm md:px-6"
          >
            {site.nav.cta.label}
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              className="h-3 w-3 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5"
            >
              <path
                d="M2.5 8h10M9 4.5 12.5 8 9 11.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </nav>
      </div>
    </motion.header>
  );
}
