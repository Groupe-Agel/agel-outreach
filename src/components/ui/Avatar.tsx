export function Avatar({
  name,
  email,
  size = 32,
}: {
  name?: string | null;
  email?: string | null;
  size?: number;
}) {
  const source = (name ?? email ?? "?").trim();
  const initials = source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "var(--color-maroon-700)",
        color: "var(--color-blush-50)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 600,
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </span>
  );
}
