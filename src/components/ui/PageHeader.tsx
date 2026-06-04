import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 24,
        paddingBottom: 24,
        borderBottom: "1px solid var(--color-ink-100)",
        marginBottom: 28,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {breadcrumb && (
          <div style={{ marginBottom: 12, fontSize: 13, color: "var(--color-ink-400)" }}>
            {breadcrumb}
          </div>
        )}
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h1 className="h-page">{title}</h1>
        {subtitle && (
          <p
            style={{
              margin: "10px 0 0",
              color: "var(--color-ink-600)",
              fontSize: 14.5,
              maxWidth: 640,
              textWrap: "pretty",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>
      )}
    </div>
  );
}
