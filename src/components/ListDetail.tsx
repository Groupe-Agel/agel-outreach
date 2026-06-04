"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

type ListSummary = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
};

type Member = {
  id: string;
  email: string;
  mergeData: Record<string, unknown>;
};

export function ListDetail({
  list,
  members,
}: {
  list: ListSummary;
  members: Member[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const columns = Array.from(
    new Set(members.flatMap((m) => Object.keys(m.mergeData))),
  ).sort();

  function remove() {
    if (!confirm(`Delete the list "${list.name}"? This cannot be undone.`)) {
      return;
    }
    start(async () => {
      const res = await fetch(`/api/lists/${list.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Delete failed");
        return;
      }
      router.push("/lists");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--color-ink-600)" }}>
          {list.memberCount} {list.memberCount === 1 ? "contact" : "contacts"}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={remove}
          disabled={pending}
          style={{ color: "var(--color-danger-700)" }}
        >
          <Icon name="trash" size={14} />
          {pending ? "Deleting…" : "Delete list"}
        </button>
      </div>

      {members.length === 0 ? (
        <div style={{ fontSize: 14, color: "var(--color-ink-600)" }}>
          No contacts in this list.
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--color-ink-100)",
            borderRadius: 10,
            background: "#ffffff",
            overflow: "auto",
            maxHeight: 600,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: "var(--color-ink-25)",
              }}
            >
              <tr>
                <th style={th}>Email</th>
                {columns.map((c) => (
                  <th key={c} style={th}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid var(--color-ink-50)" }}>
                  <td style={td}>
                    <span className="mono">{m.email}</span>
                  </td>
                  {columns.map((c) => (
                    <td key={c} style={td}>
                      {String(m.mergeData[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--color-ink-600)",
  fontWeight: 500,
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  color: "var(--color-ink-700)",
};
