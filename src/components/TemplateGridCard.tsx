import Link from "next/link";

export function TemplateGridCard({
  t,
}: {
  t: {
    id: string;
    name: string;
    description: string | null;
    variables: string[];
    updatedAt: string;
  };
}) {
  const updated = new Date(t.updatedAt);
  return (
    <Link
      href={`/templates/${t.id}`}
      className="card template-card"
      style={{
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "all 120ms",
      }}
    >
      {/* Mock thumbnail */}
      <div
        style={{
          height: 140,
          background: "var(--color-ink-25)",
          borderBottom: "1px solid var(--color-ink-100)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            height: 32,
            background: "var(--color-maroon-700)",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 9,
              color: "var(--color-blush-50)",
              fontWeight: 600,
              letterSpacing: "0.1em",
            }}
          >
            AGEL GROUP
          </span>
        </div>
        <div
          style={{
            padding: "50px 12px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div className="skeleton" style={{ height: 8, width: "60%" }} />
          <div className="skeleton" style={{ height: 6, width: "90%" }} />
          <div className="skeleton" style={{ height: 6, width: "80%" }} />
          <div style={{ height: 4 }} />
          <div
            style={{
              height: 18,
              width: 70,
              background: "var(--color-maroon-700)",
              borderRadius: 3,
            }}
          />
        </div>
      </div>

      <div
        style={{
          padding: 16,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-ink-800)",
            letterSpacing: "-0.01em",
            marginBottom: 4,
          }}
        >
          {t.name}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11.5,
            color: "var(--color-ink-400)",
            marginBottom: 12,
          }}
        >
          Updated {updated.toLocaleDateString()}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginTop: "auto",
          }}
        >
          {t.variables.slice(0, 4).map((v) => (
            <span
              key={v}
              className="mono"
              style={{
                fontSize: 10.5,
                padding: "2px 6px",
                background: "var(--color-blush-100)",
                color: "var(--color-maroon-700)",
                borderRadius: 4,
              }}
            >
              {v}
            </span>
          ))}
          {t.variables.length > 4 && (
            <span
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--color-ink-400)",
                padding: "2px 4px",
              }}
            >
              +{t.variables.length - 4}
            </span>
          )}
        </div>
      </div>
      <style>{`
        .template-card:hover {
          border-color: var(--color-blush-200) !important;
          box-shadow: var(--shadow-md) !important;
        }
      `}</style>
    </Link>
  );
}
