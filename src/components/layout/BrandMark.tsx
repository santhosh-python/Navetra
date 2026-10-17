/** Navetra mark: an accent-coloured rounded square with a stock-level bar. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#D97732" />
      <rect x="8" y="8" width="16" height="4" rx="2" fill="#FFFFFF" opacity="0.95" />
      <rect x="8" y="14" width="11" height="4" rx="2" fill="#FFFFFF" opacity="0.75" />
      <rect x="8" y="20" width="6" height="4" rx="2" fill="#FFFFFF" opacity="0.55" />
    </svg>
  );
}
