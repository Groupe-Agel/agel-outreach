"use client";

export function Toggle({
  value,
  onChange,
  ariaLabel,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      onClick={() => onChange(!value)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        background: value ? "var(--color-maroon-700)" : "var(--color-ink-200)",
        border: "none",
        position: "relative",
        cursor: "pointer",
        transition: "background 150ms",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: value ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 160ms cubic-bezier(.4,.0,.2,1)",
        }}
      />
    </button>
  );
}
