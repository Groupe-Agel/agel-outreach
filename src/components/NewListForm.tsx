"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ParseResult } from "@/types/contact";

export function NewListForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function uploadFile(f: File) {
    setError(null);
    const form = new FormData();
    form.append("file", f);
    const res = await fetch("/api/parse", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to parse file");
      return;
    }
    setParsed(data);
  }

  function save() {
    if (!parsed || parsed.rows.length === 0) {
      setError("Upload a file with at least one valid contact first.");
      return;
    }
    if (!name.trim()) {
      setError("Give your list a name.");
      return;
    }
    start(async () => {
      setError(null);
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          contacts: parsed.rows,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      router.push(`/lists/${data.id}`);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      <Field label="Name">
        <input
          className="input"
          placeholder="Q3 partners outreach"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Description (optional)">
        <input
          className="input"
          placeholder="Owners of small marketing agencies in Casablanca and Rabat"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <Field label="Contacts file (.json / .csv / .xlsx)">
        <input
          type="file"
          accept=".json,.csv,.xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
          }}
          className="block w-full text-sm"
        />
      </Field>

      {parsed && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "var(--color-blush-50)",
            border: "1px solid var(--color-blush-200)",
            fontSize: 13.5,
          }}
        >
          <strong>{parsed.rows.length}</strong> valid contacts
          {parsed.errors.length > 0 && (
            <>
              ,{" "}
              <span style={{ color: "var(--color-danger-700)" }}>
                {parsed.errors.length} skipped
              </span>
            </>
          )}
          <div
            style={{
              fontSize: 12,
              color: "var(--color-ink-600)",
              marginTop: 4,
            }}
          >
            Columns: {parsed.columns.join(", ")}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 6,
            background: "var(--color-danger-50)",
            color: "var(--color-danger-700)",
            border: "1px solid #f3c5c0",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={pending}
        >
          {pending ? "Saving…" : "Save list"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: "var(--color-ink-700)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
