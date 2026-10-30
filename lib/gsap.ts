import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point for GSAP plugins.
 *
 * Import gsap/ScrollTrigger from this module everywhere — never register the
 * plugin again in a component. ScrollTrigger is browser-only, so registration
 * is guarded for SSR/prerender.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.9 });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };

/** Mobile breakpoint used by gsap.matchMedia() in every section. */
export const MOBILE_QUERY = "(max-width: 768px)";

/** Query for users who want motion. */
export const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";

/** Query for users who want the static end state. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
