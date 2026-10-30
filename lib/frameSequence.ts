/**
 * Shared canvas frame-sequence player for scrubbed scenes (coating wipe,
 * payoff sun flood). Owns the DPR-capped cover-fit canvas, one shared
 * gsap.ticker draw queue, batched decoding that starts only when the scene
 * is near the viewport, and windowed frame release for memory.
 *
 * - Frames decode in BATCHES of 10; between batches the loader yields to
 *   requestIdleCallback (short-timeout fallback) so decoding never starves
 *   scroll. The first decoded frame paints immediately (poster).
 * - Frames decode to right-sized ImageBitmaps where available (desktop and
 *   mobile), so drawImage skips per-draw decode work. Browsers without
 *   createImageBitmap fall back to <img>.
 * - WINDOWED RELEASE: only frames near the current scrub index stay decoded;
 *   far frames are closed (bitmap.close()) / dropped and re-decoded on demand
 *   (HTTP-cached, so re-decodes are cheap).
 * - `minLoadedFraction` keeps a scene on its poster until that fraction of
 *   the sequence is decoded (e.g. 0.8 = don't advance until 80% loaded).
 * - `focusX`/`focusY` (0–1) pick which part of the frame survives the
 *   cover-fit crop — portrait stages crop the sides, so the car stays in
 *   view by focusing the keep-window.
 * - DPR is capped at 1.5, or 1.25 on low-core-count (low-end) devices.
 * - `reduced` skips the preloader/observer entirely and paints only the
 *   final frame (the static end state).
 */

import { gsap } from "@/lib/gsap";

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
  /** Source frame pixel dimensions (drives bitmap downsizing). */
  width: number;
  height: number;
  desktop: boolean;
  /** Preloading starts when the stage enters this IO rootMargin. */
  preloadMargin?: string;
  /** Frames kept decoded on each side of the current index. */
  window?: number;
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
  /** Ticker-batched draw for scrub updates — never double-draws a frame. */
  queueDraw: (index: number) => void;
  /** Drop listeners, observers and any queued work. */
  dispose: () => void;
}

/** Frames kept decoded on each side of the current index. */
const KEEP_WINDOW_DESKTOP = 16;
const KEEP_WINDOW_MOBILE = 16;
const BATCH_SIZE = 10;
/** Bitmap decode target width cap — bounds bitmap memory per frame. */
const BITMAP_MAX_WIDTH = 1280;

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
    preloadMargin = "150% 0px",
    window: keepWindow,
    minLoadedFraction = 0,
    focusX = 0.5,
    focusY = 0.5,
    reduced = false,
    onAfterDraw,
  } = options;

  const windowRadius = keepWindow ?? (desktop ? KEEP_WINDOW_DESKTOP : KEEP_WINDOW_MOBILE);

  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
    return { draw: () => undefined, queueDraw: () => undefined, dispose: () => undefined };
  }

  const frames: Array<FrameSource | null> = new Array(count).fill(null);
  const pending = new Set<number>();
  let current = -1; // last successfully painted index
  let loaded = 0; // frames decoded so far (monotonic)
  let dirty = false;
  let rafTarget = 0;
  let offscreen = false;
  let disposed = false;
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

  const releaseFrame = (index: number) => {
    const f = frames[index];
    if (!f) return;
    if (typeof ImageBitmap !== "undefined" && f instanceof ImageBitmap) f.close();
    frames[index] = null;
  };

  const releaseFar = (index: number) => {
    for (let i = 0; i < count; i += 1) {
      if (i === index) continue;
      if (Math.abs(i - index) > windowRadius) releaseFrame(i);
    }
  };

  const draw = (index: number, force = false) => {
    if (disposed) return;
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
    // Drop frames far from the new index (bitmaps closed, imgs dropped).
    releaseFar(clamped);
    if (onAfterDraw) onAfterDraw(clamped);
  };

  /** Decode a single frame on demand (HTTP cache makes re-decodes cheap). */
  const ensureFrame = (index: number) => {
    if (frames[index] || pending.has(index) || disposed) return;
    pending.add(index);
    void decodeFrame(index).then((decoded) => {
      pending.delete(index);
      if (!decoded || disposed) return;
      frames[index] = decoded;
      if (index + 1 > loaded) loaded = index + 1;
      // Paint only if this frame is still the wanted one.
      if (index === rafTarget && !offscreen) draw(index, true);
    });
  };

  // --- shared gsap.ticker draw queue (no per-player rAF loops) --------------
  const update = () => {
    if (!dirty || offscreen || disposed) return;
    dirty = false;
    if (frames[rafTarget]) draw(rafTarget);
    else ensureFrame(rafTarget);
  };
  gsap.ticker.add(update);

  const queueDraw = (index: number) => {
    const clamped = Math.min(count - 1, Math.max(0, Math.round(index)));
    if (clamped === current) return;
    rafTarget = clamped;
    dirty = true;
  };

  // --- bitmap/img decode ----------------------------------------------------
  const decodeFrame = async (
    index: number,
    signal?: AbortSignal,
  ): Promise<FrameSource | null> => {
    const url = frameUrl(index + 1);
    if (typeof createImageBitmap === "function") {
      try {
        const blob = await (await fetch(url, { signal })).blob();
        const targetW = Math.min(canvas.width || 900, desktop ? BITMAP_MAX_WIDTH : width);
        const bmp = await createImageBitmap(blob, {
          resizeWidth: targetW,
          resizeHeight: Math.max(1, Math.round((targetW * height) / width)),
          resizeQuality: "medium",
        });
        return bmp;
      } catch {
        // Aborted fetches must NOT fall through to the <img> fallback —
        // that would defeat the cancellation.
        if (signal?.aborted) return null;
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

  /** Decode frames in batches, yielding to idle time between batches. */
  const idle = (cb: () => void) => {
    const ric = (
      window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    ).requestIdleCallback;
    if (ric) ric(cb, { timeout: 400 });
    else window.setTimeout(cb, 150);
  };

  /**
   * Decode the whole sequence in batches. Aborted when the user scrolls far
   * past the scene; a later IO re-enter resumes from the first missing
   * frame (already-decoded frames are skipped).
   */
  const preloadSeq = async (signal: AbortSignal) => {
    for (let start = 0; start < count; start += BATCH_SIZE) {
      if (disposed || signal.aborted) return;
      const end = Math.min(count, start + BATCH_SIZE);
      const batch: Array<{ index: number; promise: Promise<FrameSource | null> }> = [];
      for (let i = start; i < end; i += 1) {
        if (!frames[i]) batch.push({ index: i, promise: decodeFrame(i, signal) });
      }
      if (batch.length > 0) {
        const decoded = await Promise.all(batch.map((b) => b.promise));
        if (disposed || signal.aborted) return;
        for (let k = 0; k < batch.length; k += 1) {
          const { index } = batch[k];
          if (decoded[k]) frames[index] = decoded[k];
          if (decoded[k] && index + 1 > loaded) loaded = index + 1;
        }
        // First decoded frame paints immediately so the plate is never
        // empty when the user arrives.
        if (start === 0) draw(0, true);
        // Yield to the main thread between batches.
        await new Promise<void>((r) => idle(() => r()));
        if (signal.aborted) return;
      }
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
      dispose: () => {
        disposed = true;
        gsap.ticker.remove(update);
        window.removeEventListener("resize", onResize);
        releaseFar(count - 1);
        releaseFrame(count - 1);
      },
    };
  }

  // --- batched decode, started near the viewport, cancelled far past -------
  let preloadStarted = false;
  let inView = false;
  let preloadAbort: AbortController | null = null;
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible === inView) return;
      inView = visible;
      offscreen = !visible;
      if (!offscreen) {
        window.addEventListener("resize", onResize, { passive: true });
        if (!preloadStarted) {
          preloadStarted = true;
          // Fresh controller per run: a previous run aborted mid-flight
          // leaves its loop returning asynchronously.
          preloadAbort = new AbortController();
          void preloadSeq(preloadAbort.signal);
        }
        draw(current, true);
      } else {
        // Scrolled far past (~1.5 screens beyond the margin): cancel any
        // queued batches; a later re-enter resumes from the first missing
        // frame. Also release the resize listener and any queued draw.
        preloadAbort?.abort();
        preloadStarted = false;
        window.removeEventListener("resize", onResize);
        dirty = false;
        // Memory: release everything except the current poster/plate.
        releaseFar(current < 0 ? 0 : current);
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
      preloadAbort?.abort();
      io.disconnect();
      gsap.ticker.remove(update);
      window.removeEventListener("resize", onResize);
      for (let i = 0; i < count; i += 1) releaseFrame(i);
    },
  };
}
