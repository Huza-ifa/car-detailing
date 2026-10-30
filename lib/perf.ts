/**
 * One-time frame-rate probe for the "lighter mode" (AGENTS §7).
 *
 * Samples requestAnimationFrame deltas for ~1s after mount and resolves
 * `true` when the device sustains fewer than ~40fps. Sections use the
 * result to skip NON-ESSENTIAL decoration (parallax drift layers, foam
 * particles) on slow devices — the core scrubbed scenes always run.
 * Reduced-motion users never reach these paths anyway.
 *
 * Also stamps a `low-perf` class on <html> so CSS can opt into the same
 * lighter mode. Client-only module — never import from a Server Component.
 */

/** fps below which the device gets the lighter mode. */
const FPS_FLOOR = 40;

/** How many frames to sample before deciding. */
const SAMPLES = 60;

let result: boolean | null = null;
let checking: Promise<boolean> | null = null;

/** Resolves once the probe finished — `true` = device gets the lighter mode. */
export function detectLowPerf(): Promise<boolean> {
  if (result !== null) return Promise.resolve(result);
  checking ??= new Promise<boolean>((resolve) => {
    let frames = 0;
    let start = 0;
    const tick = (now: number) => {
      if (start === 0) start = now;
      frames += 1;
      if (frames < SAMPLES) {
        requestAnimationFrame(tick);
        return;
      }
      const seconds = (now - start) / 1000;
      result = seconds > 0 && frames / seconds < FPS_FLOOR;
      if (result) document.documentElement.classList.add("low-perf");
      resolve(result);
    };
    requestAnimationFrame(tick);
  });
  return checking;
}

/** Synchronous read of the probe result (false before it finished). */
export function isLowPerf(): boolean {
  return result === true;
}
