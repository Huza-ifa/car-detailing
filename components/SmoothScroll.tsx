"use client";

import Lenis from "lenis";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

const LenisContext = createContext<Lenis | null>(null);

/** Access the single Lenis instance (null during SSR / before mount). */
export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

/**
 * Creates the site's only Lenis instance and drives it from the GSAP ticker so
 * ScrollTrigger and smooth scrolling stay in sync.
 *
 * Must wrap every page that uses scroll-driven animation.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const reduceMotion = prefersReducedMotion();

    const instance = new Lenis({
      autoRaf: false,
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      smoothWheel: !reduceMotion,
      syncTouch: false,
      touchMultiplier: 1.4,
    });

    setLenis(instance);

    const handleScroll = () => ScrollTrigger.update();
    instance.on("scroll", handleScroll);

    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const refreshFrame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    // Debounced manual refresh for resize + orientation change (mobile
    // rotation) — belt and braces with ScrollTrigger's own resize handling.
    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        if (!cancelled) ScrollTrigger.refresh();
      }, 250);
    };
    window.addEventListener("resize", scheduleRefresh, { passive: true });
    window.addEventListener("orientationchange", scheduleRefresh);

    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      window.removeEventListener("resize", scheduleRefresh);
      window.removeEventListener("orientationchange", scheduleRefresh);
      window.cancelAnimationFrame(refreshFrame);
      instance.off("scroll", handleScroll);
      gsap.ticker.remove(raf);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
  );
}
