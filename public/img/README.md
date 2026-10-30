# Image assets

All image paths are declared in `/config/site.ts` as `ImageAsset` objects
(`src`, `alt`, `width`, `height`). Components must not hardcode paths.

## Requirements

- Format: **AVIF**, falling back to WebP. `next.config.mjs` enables both. Scene plates
  (car-dirty / car-clean) ship as WebP.
- Hero: **under 300KB**, quality 70–80. The dirty plate doubles as the hero and is
  139 KB at master size 1536×2752.
- Below the fold: lazy-loaded by `next/image` (the default), with accurate `sizes`.
- Always provide intrinsic dimensions to prevent layout shift.
- Keep the filename and path in sync with `config/site.ts`.
- `car-dirty.webp` and `car-clean.webp` ship at **identical dimensions (1536×2752,
  portrait)** so both plates render from the same master size; `AlignedImageStack`
  warns (dev-only) if their natural sizes ever differ. Both images share the same
  studio set and camera distance; the wipe reads as a before/after crossfade on
  the shared framing rather than a pixel-registered rotation.
- Desktop `--car-focus` is `50% 28%` and mobile `50% 50%` (portrait masters) so the
  car stays in frame on landscape and portrait viewports.
- `grain.png` is a tiny tiling noise texture used by `GrainOverlay` at 3%
  opacity — decorative only, always `pointer-events-none`.
- `paint-macro-before.webp` and `paint-macro-after.webp` share the same geometry too;
  the MacroReveal clip is anchored on the swirl cluster at 62% × 42%.
- The corrected macro plate is eager-loaded: it sits behind a clip-path until the
  midpoint of the pinned scene, so lazy loading can blank the reveal.

## Expected files

| Path                          | Dimensions | Usage                         |
| ----------------------------- | ---------- | ----------------------------- |
| `car-dirty.webp`              | 1536×2752  | Hero background + wash "dirty" plate |
| `car-clean.webp`              | 1536×2752  | Wash "clean" plate (aligned)  |
| `grain.png`                   | 128×128 tile | 3% film-grain overlay (decorative) |

## Wash sequence frames (public/seq)

`wash/` (desktop, 120 frames) and `wash-m/` (mobile, 96) are extracted from
`assets/wash.mp4.mp4` (1280×720@24fps, 8.0s) by FFmpeg (fps 15/12, libwebp q70/65,
source width preserved — never upscaled). One locked-off studio wash: frame 1
dirty, frame mid foam-spray, last frame glossy clean. WashScene maps scrub
progress → frame index; config lives in `site.images.washSeq`. When the source
video changes, re-extract and update counts/dims.
| `paint-macro-before.webp`      | 2400×1600  | Macro reveal — swirled plate  |
| `paint-macro-after.webp`       | 2400×1600  | Macro reveal — corrected plate (aligned) |
| `car-golden.webp`              | 2400×1600  | Payoff scene — golden hour    |
| `proof-bay.avif`              | 2000×1333  | Proof — studio bay            |
| `proof-before.avif`           | 1600×1200  | Proof — before                |
| `proof-after.avif`            | 1600×1200  | Proof — after                 |
| `service-wash.avif`           | 1600×1200  | Signature Wash card           |
| `service-interior.avif`       | 1600×1200  | Interior Reset card           |
| `service-correction.avif`     | 1600×1200  | Paint Correction card         |
| `service-ceramic.avif`        | 1600×1200  | Ceramic Coating card          |
| `og.avif`                     | 1200×630   | Open Graph / social preview   |
