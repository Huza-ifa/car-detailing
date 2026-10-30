/**
 * 3% film-grain overlay. Blends full-bleed photography into the UI so the
 * plates do not look pasted onto the near-black surfaces.
 */
export default function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-50 opacity-[0.03] [background-image:url(/img/grain.png)] [background-repeat:repeat]"
    />
  );
}
