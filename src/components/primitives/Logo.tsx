/** Dokoon wordmark from the sprite; colors follow --logo1/--logo2 so it flips in dark theme. */
export function Logo({ className, height = 24 }: { className?: string; height?: number }) {
  return (
    <svg
      className={className}
      viewBox="0 0 902.92 251.16"
      height={height}
      width={(height * 902.92) / 251.16}
      role="img"
      aria-label="دکون"
    >
      <use href="#dk-logo" />
    </svg>
  );
}
