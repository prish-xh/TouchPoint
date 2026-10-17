// Touchpoint mark: a pair of glasses whose lenses are touch points.
// Colors come from the theme, so it switches with high contrast.

export function Logo({ size = 40, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="72" height="72" rx="18" fill="var(--logo-bg)" />
      <circle cx="24" cy="38" r="10" fill="none" stroke="var(--logo-fg)" strokeWidth="3" />
      <circle cx="48" cy="38" r="10" fill="none" stroke="var(--logo-fg)" strokeWidth="3" />
      <path d="M34 37q2-3 4 0" fill="none" stroke="var(--logo-fg)" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 36l-4-3M58 36l4-3" stroke="var(--logo-fg)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="38" r="4" fill="var(--logo-dot)" />
      <circle cx="48" cy="38" r="4" fill="var(--logo-dot)" />
    </svg>
  );
}
