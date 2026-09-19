export const REACH_TERMS = ['Storefront Radius', 'Metro Reach', 'Regional IP'] as const;

export function ReachTermStrip({
  className = '',
  solid = false,
  onDark = false,
}: {
  className?: string;
  solid?: boolean;
  onDark?: boolean;
}) {
  const badgeClass = onDark
    ? 'text-white font-mono text-xs uppercase tracking-wider px-2.5 py-1 bg-transparent border border-white/20'
    : solid
      ? 'text-white font-mono text-xs uppercase tracking-wider px-2.5 py-1 bg-[#08080A] border border-white/20'
      : 'text-white font-mono text-xs uppercase tracking-wider px-2.5 py-1 bg-black/60 border border-white/20';

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
      aria-label="Spatial reach terms"
    >
      {REACH_TERMS.map((term, i) => (
        <span key={term} className="inline-flex items-center gap-2">
          {i > 0 && (
            <span className="font-mono text-[11px] text-white/40" aria-hidden="true">
              /
            </span>
          )}
          <span className={badgeClass}>{term}</span>
        </span>
      ))}
    </div>
  );
}
