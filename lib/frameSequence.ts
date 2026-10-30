/**
 * Shared canvas frame-sequence player for scrubbed scenes (coating wipe,
 * payoff sun flood). Owns the DPR-capped cover-fit canvas, the rAF-batched
 * draw queue, sequential decoding that starts only when the scene is near
 * the viewport, and pause/cleanup while off-screen.
 *
 * - Frames decode in order; the first decoded frame paints immediately so
 *   the plate is never empty when the user arrives (poster).
 * - Mobile decodes straight to right-sized ImageBitmaps where available
 *   (full-res bitmaps for 100+ frames would hold far too much memory);
 *   desktop keeps <img> so the browser's LRU decoded-image cache manages
 *   the set.
 * - `minLoadedFraction` keeps a scene on its poster until that fraction of
 *   the sequence is decoded (e.g. 0.8 = don't advance until 80% loaded).
 * - `focusX`/`focusY` (0–1) pick which part of the frame survives the
 *   cover-fit crop — portrait stages crop the sides, so the car stays in
 *   view by focusing the keep-window (e.g. 50% 60%).
 * - DPR is capped at 1.5, or 1.25 on low-core-count (low-end) devices.
 * - `reduced` skips the preloader/observer entirely and paints only the
 *   final frame (the static end state).
 */

export type FrameSource = HTMLImageElement | ImageBitmap;

export interface FrameSequenceOptions {
  canvas: HTMLCanvasElement;
  /** Sized element the canvas is fitted to (usually the pin stage). */
  stage: HTMLElement;
  /** Frame URL pieces: `${base}${padStart(index, pad)}.${ext}` (1-based). */
  base: string;
  count: number;
  pad: number;
  ext: string;
  /** Source frame pixel dimensions (drives mobile bitmap downsizing). */
  width: number;
  height: number;
  desktop: boolean;
  /** Preloading starts when the stage enters this IO rootMargin. */
  preloadMargin?: string;
  /**
   * Fraction (0–1) of frames that must decode before frames other than the
   * poster (frame 1) may paint. 0 = draw as soon as each frame decodes.
   */
  minLoadedFraction?: number;
  /** Cover-fit crop focus, 0–1 (0.5 = centered). Config-driven per scene. */
  focusX?: number;
  focusY?: number;
  /** Reduced motion: no preloader, no observer — final frame only. */
  reduced?: boolean;
  /**
   * Called after a frame is actually painted (same canvas, identity
   * transform). Dev-only — used by the coating scene's ?debug=1 edge overlay.
   */
  onAfterDraw?: (index: number) => void;
}

export interface FrameSequenceHandle {
  /** Paint a frame now (cover-fit). No-op unless the index changed. */
  draw: (index: number, force?: boolean) => void;
  /** rAF-batched draw for scrub updates — never double-draws a frame. */
  queueDraw: (index: number) => void;
  /** Drop listeners, observers and any queued work. */
  dispose: () => void;
}

export function createFrameSequence(
  options: FrameSequenceOptions,
): FrameSequenceHandle {
  const {
    canvas,
    stage,
    base,
    count,
    pad,
    ext,
    width,
    height,
    desktop,
    preloadMargin = "160% 0px",
    minLoadedFraction = 0,
    focusX = 0.5,
    focusY = 0.5,
    reduced = false,
    onAfterDraw,
  } = options;

  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
    return { draw: () => undefined, queueDraw: () => undefined, dispose: () => undefined };
  }

  const frames: Array<FrameSource | null> = new Array(count).fill(null);
  let current = -1; // last successfully painted index
  let loaded = 0; // frames decoded so far
  const minLoaded = Math.ceil(minLoadedFraction * count);

  const frameUrl = (index: number) =>
    `${base}${String(index).padStart(pad, "0")}.${ext}`;

  // --- canvas cover-fit renderer (DPR + resize aware) -----------------------
  /** DPR cap: 1.5 everywhere, 1.25 on low-core-count (low-end) devices. */
  const dprCap = () =>
    Math.min(
      window.devicePixelRatio || 1,
      (navigator.hardwareConcurrency ?? 8) <= 4 ? 1.25 : 1.5,
    );

  const size = () => {
    const dpr = dprCap();
    canvas.width = Math.max(1, Math.round(stage.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(stage.clientHeight * dpr));
  };
  size();

  const draw = (index: number, force = false) => {
    const clamped = Math.min(count - 1, Math.max(0, Math.round(index)));
    // Only paint when the frame index actually changed (or forced, e.g.
    // after a resize).
    if (!force && clamped === current) return;
    // Gated scenes stay on the poster until enough frames have decoded.
    if (clamped !== 0 && loaded < minLoaded) return;
    const img = frames[clamped];
    if (!img) return;
    const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    if (!iw || !ih) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);
    current = clamped;
    ctx2d.clearRect(0, 0, cw, ch);
    // Cover-fit with a configurable focal point: the overflow window (which
    // side of the frame is cropped) follows focusX/focusY so the car stays
    // in view on tall/portrait stages.
    ctx2d.drawImage(
      img,
      Math.round((cw - dw) * focusX),
      Math.round((ch - dh) * focusY),
      dw,
      dh,
    );
    if (onAfterDraw) onAfterDraw(clamped);
  };

  // Scrub updates queue one rAF each — never double-draws a frame.
  let raf: number | null = null;
  let rafTarget = 0;
  const queueDraw = (index: number) => {
    rafTarget = index;
    if (raf !== null) return;
    raf = window.requestAnimationFrame(() => {
      raf = null;
      draw(rafTarget);
    });
  };
  const stopRaf = () => {
    if (raf !== null) {
      window.cancelAnimationFrame(raf);
      raf = null;
    }
  };

  const onResize = () => {
    size();
    draw(current, true);
  };

  // --- reduced motion: finished state, last frame, done ---------------------
  if (reduced) {
    const lastImg = new Image();
    lastImg.decoding = "async";
    // Plain load-event wait: decode() has been seen to reject on machines
    // where the image is perfectly valid — reduced motion must still paint.
    lastImg.onload = () => {
      frames[count - 1] = lastImg;
      loaded = count;
      draw(count - 1, true);
    };
    lastImg.src = frameUrl(count);
    window.addEventListener("resize", onResize, { passive: true });
    return {
      draw,
      queueDraw,
      dispose: () => window.removeEventListener("resize", onResize),
    };
  }

  // --- sequential decode, started near the viewport -------------------------
  let disposed = false;

  const decodeFrame = async (index: number): Promise<FrameSource | null> => {
    const url = frameUrl(index + 1);
    if (!desktop && typeof createImageBitmap === "function") {
      try {
        const blob = await (await fetch(url)).blob();
        const targetW = Math.min(canvas.width || 900, width);
        return await createImageBitmap(blob, {
          resizeWidth: targetW,
          resizeHeight: Math.max(1, Math.round((targetW * height) / width)),
          resizeQuality: "medium",
        });
      } catch {
        /* fall through to <img> decode */
      }
    }
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    try {
      await img.decode();
      return img;
    } catch {
      // decode() can reject on some machines (GPU/driver quirks, memory
      // pressure) even though the image is fine — fall back to the load
      // event before giving up on the frame.
      if (img.complete && img.naturalWidth > 0) return img;
      return await new Promise<FrameSource | null>((resolve) => {
        img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
        img.onerror = () => resolve(null);
      });
    }
  };

  const preloadSeq = async () => {
    for (let i = 0; i < count; i += 1) {
      if (disposed) return;
      const decoded = await decodeFrame(i);
      if (disposed) return;
      frames[i] = decoded;
      loaded = i + 1;
      // First decoded frame paints immediately so the plate is never empty
      // when the user arrives.
      if (i === 0) draw(0, true);
    }
  };

  // Preload + redraws only while the scene is near/on screen, and the
  // preloader starts exactly once even if the observer re-fires.
  let inView = false;
  let preloadStarted = false;
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible === inView) return;
      inView = visible;
      if (inView) {
        window.addEventListener("resize", onResize, { passive: true });
        if (!preloadStarted) {
          preloadStarted = true;
          void preloadSeq();
        }
        draw(current, true);
      } else {
        // Off-screen: release the resize listener and any queued draw.
        window.removeEventListener("resize", onResize);
        stopRaf();
      }
    },
    { rootMargin: preloadMargin },
  );
  io.observe(stage);

  return {
    draw,
    queueDraw,
    dispose: () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("resize", onResize);
      stopRaf();
    },
  };
}
