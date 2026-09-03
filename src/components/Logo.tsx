/**
 * One circle, split. Half solid, half drawn — the human and the agent
 * weighing the same position. The gap at the centre is the interpunct in the
 * name. Built from two paths so it stays legible at 16px.
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flex: "none", display: "block" }}>
      <path d="M16 3 A13 13 0 0 0 16 29 Z" fill="var(--gold)" />
      <path d="M16 3 A13 13 0 0 1 16 29" stroke="var(--ink)" strokeWidth="1.6" fill="none" />
      <circle cx="16" cy="16" r="2.4" fill="var(--void)" />
    </svg>
  );
}
