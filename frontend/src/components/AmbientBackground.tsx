/**
 * Site-wide ambient layer: slow-drifting gradient orbs + faint topographic
 * contour pattern. Sits behind all page content at very low opacity.
 */
export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden [contain:layout_paint]"
      aria-hidden
    >
      <div className="absolute inset-0 dash-animated-bg opacity-60" />
      <div className="absolute inset-0 ambient-contours" />
      <div
        className="ambient-orb-a absolute -top-40 -left-32 h-[480px] w-[480px] rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(circle, hsl(168 55% 42% / 0.35), transparent 70%)" }}
      />
      <div
        className="ambient-orb-b absolute top-1/2 -right-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, hsl(202 65% 50% / 0.3), transparent 70%)" }}
      />
      <div
        className="ambient-orb-a absolute -bottom-48 left-1/3 h-[420px] w-[420px] rounded-full blur-3xl opacity-15"
        style={{
          background: "radial-gradient(circle, hsl(38 90% 55% / 0.22), transparent 70%)",
          animationDelay: "-11s",
        }}
      />
    </div>
  );
}
