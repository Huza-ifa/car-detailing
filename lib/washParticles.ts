/**
 * Foam / sparkle particle engine for the WashScene wipe edge.
 *
 * Dynamically imported by components/sections/WashScene.tsx so the canvas code
 * never ships in the initial bundle. Browser-only; never imported on the server
 * or in a Server Component.
 */

import { gsap } from "@/lib/gsap";

const CYAN = "34,211,238";
const WHITE = "255,255,255";

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
}

export interface ParticleEngine {
  /** Spawn a few particles around the wipe line; call from the scroll render. */
  emitAlongEdge(progress: number, deltaPercent: number): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

export function createWashParticles(
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  max = 40,
): ParticleEngine {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
    return {
      emitAlongEdge: () => undefined,
      start: () => undefined,
      stop: () => undefined,
      destroy: () => undefined,
    };
  }

  // Pre-rendered glow sprites — per-particle canvas shadowBlur is the
  // slowest 2D-canvas operation; a small offscreen sprite per color turns
  // each particle into one drawImage call instead.
  const SPRITE_SIZE = 32;
  const makeSprite = (rgb: string) => {
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const g = sctx.createRadialGradient(
        SPRITE_SIZE / 2,
        SPRITE_SIZE / 2,
        0,
        SPRITE_SIZE / 2,
        SPRITE_SIZE / 2,
        SPRITE_SIZE / 2,
      );
      g.addColorStop(0, `rgba(${rgb},0.9)`);
      g.addColorStop(0.4, `rgba(${rgb},0.35)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    }
    return sprite;
  };
  const whiteSprite = makeSprite(WHITE);
  const cyanSprite = makeSprite(CYAN);

  const dims = { w: stage.clientWidth, h: stage.clientHeight };
  // Same tiered DPR cap as the frame player: 1.5, 1.25 on low-end devices.
  const dpr = Math.max(
    1,
    Math.min(
      window.devicePixelRatio || 1,
      (navigator.hardwareConcurrency ?? 8) <= 4 ? 1.25 : 1.5,
    ),
  );

  const resizeCanvas = () => {
    dims.w = stage.clientWidth;
    dims.h = stage.clientHeight;
    canvas.width = Math.round(dims.w * dpr);
    canvas.height = Math.round(dims.h * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resizeCanvas();

  const observer = new ResizeObserver(resizeCanvas);
  observer.observe(stage);

  const pool: Particle[] = Array.from({ length: max }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    life: 0,
    size: 0,
    color: WHITE,
  }));
  let poolIndex = 0;
  let edgeX = 0;
  let running = false;

  const spawn = () => {
    const p = pool[poolIndex];
    poolIndex = (poolIndex + 1) % max;
    p.active = true;
    p.x = edgeX + (Math.random() - 0.5) * 24;
    p.y = Math.random() * dims.h;
    p.vx = (Math.random() - 0.5) * 90;
    p.vy = -18 - Math.random() * 54;
    p.age = 0;
    p.life = 0.45 + Math.random() * 0.75;
    p.size = 0.8 + Math.random() * 1.6;
    p.color = Math.random() < 0.35 ? CYAN : WHITE;
  };

  const emitAlongEdge = (progress: number, deltaPercent: number) => {
    edgeX = progress * dims.w;
    const count = Math.min(4, Math.round(deltaPercent * 1.2) + 1);
    for (let i = 0; i < count; i += 1) spawn();
    if (Math.random() < 0.2) spawn();
  };

  const drawParticles = (dt: number) => {
    ctx2d.clearRect(0, 0, dims.w, dims.h);
    ctx2d.globalCompositeOperation = "lighter";

    for (const p of pool) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 30 * dt;

      const t = p.age / p.life;
      // Small, faint, near the line — never allowed to cover the car. The
      // sprite's soft falloff stands in for the old core + shadow glow.
      const alpha = (1 - t) * 0.42;
      const size = p.size * (1 + t * 0.7) * 7;
      ctx2d.globalAlpha = alpha;
      ctx2d.drawImage(
        p.color === CYAN ? cyanSprite : whiteSprite,
        p.x - size / 2,
        p.y - size / 2,
        size,
        size,
      );
    }

    ctx2d.globalAlpha = 1;
    ctx2d.globalCompositeOperation = "source-over";
  };

  // Draw loop rides the shared gsap.ticker (no separate rAF loop); the
  // ticker passes deltaTime in milliseconds.
  const tick = (_time: number, deltaTime: number) => {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, deltaTime / 1000));
    drawParticles(dt);
  };

  const start = () => {
    if (running) return;
    running = true;
    gsap.ticker.add(tick);
  };

  const stop = () => {
    running = false;
    gsap.ticker.remove(tick);
    ctx2d.clearRect(0, 0, dims.w, dims.h);
  };

  return {
    emitAlongEdge,
    start,
    stop,
    destroy: () => {
      stop();
      observer.disconnect();
    },
  };
}
