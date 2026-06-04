import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
        border: "1px dashed var(--color-blush-200)",
        borderRadius: 14,
        background:
          "linear-gradient(180deg, var(--color-blush-50) 0%, #ffffff 100%)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "#ffffff",
          border: "1px solid var(--color-blush-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-maroon-700)",
          marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Icon name={icon} size={22} />
      </div>
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: "-0.015em",
          margin: "0 0 6px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "0 0 20px",
          color: "var(--color-ink-600)",
          maxWidth: 380,
          textWrap: "pretty",
        }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}
