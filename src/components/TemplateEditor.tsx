"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Icon } from "@/components/ui/Icon";
import { extractVariables } from "@/lib/templates/extract-client";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Initial = {
  name: string;
  description: string;
  subjectTpl: string;
  mjmlSource: string;
};

const SAMPLE_DATA: Record<string, string> = {
  full_name: "Yassine Afaila",
  email: "yassine.afaila@groupe-agel.com",
  organization: "Groupe AGEL",
  job_title: "Software Engineer",
  phone: "+212 6XX XX XX XX",
};

export function TemplateEditor({
  id,
  initial,
}: {
  id?: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [subjectTpl, setSubjectTpl] = useState(initial.subjectTpl);
  const [mjmlSource, setMjmlSource] = useState(initial.mjmlSource);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const variables = useMemo(
    () => extractVariables(mjmlSource + " " + subjectTpl),
    [mjmlSource, subjectTpl],
  );

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mjmlSource, sampleData: SAMPLE_DATA }),
        });
        const data = await res.json();
        if (res.ok) {
          setPreviewHtml(data.html ?? "");
          setPreviewErr(null);
        } else {
          setPreviewErr(data.error ?? "Render failed");
        }
      } catch (e) {
        setPreviewErr(e instanceof Error ? e.message : String(e));
      }
    }, 400);
    return () => clearTimeout(t);
  }, [mjmlSource]);

  function save() {
    if (!name.trim() || !subjectTpl.trim() || !mjmlSource.trim()) {
      alert("Name, subject and MJML are required");
      return;
    }
    startTransition(async () => {
      const url = id ? `/api/templates/${id}` : "/api/templates";
      const method = id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, subjectTpl, mjmlSource }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "Save failed" }));
        alert(e.error ?? "Save failed");
        return;
      }
      const data = await res.json();
      if (id) {
        router.refresh();
      } else {
        router.push(`/templates/${data.id}`);
      }
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 540px",
        gap: 24,
        minHeight: 600,
        height: "calc(100vh - 56px - 80px)",
      }}
    >
      <div
        className="card"
        style={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--color-ink-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--color-ink-25)",
          }}
        >
          <div>
            <div className="eyebrow">{id ? "Editing" : "New template"}</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginTop: 2,
                color: "var(--color-ink-800)",
              }}
            >
              {name || <span className="muted">Untitled template</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => router.push("/templates")}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !name}
            >
              {saving ? "Saving…" : id ? "Save changes" : "Create template"}
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--color-ink-100)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clever Cloud Early Access"
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="label">Subject line</label>
            <input
              className="input mono"
              value={subjectTpl}
              onChange={(e) => setSubjectTpl(e.target.value)}
              placeholder="Programme AGEL — {{organization}}"
              style={{ fontSize: 13 }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 18px",
            borderBottom: "1px solid var(--color-ink-100)",
            background: "var(--color-ink-25)",
          }}
        >
          <div
            className="eyebrow"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Icon name="code" size={12} /> MJML source
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11.5 }}
              onClick={() => navigator.clipboard?.writeText(mjmlSource)}
            >
              <Icon name="copy" size={12} /> Copy
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <Monaco
            defaultLanguage="html"
            value={mjmlSource}
            onChange={(v) => setMjmlSource(v ?? "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: "on",
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="eyebrow">Live preview · sample data</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 320 }}>
            {variables.map((v) => (
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
          </div>
        </div>
        <div
          className="card"
          style={{
            flex: 1,
            padding: 12,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "8px 4px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              fontSize: 12,
              color: "var(--color-ink-600)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: previewErr
                  ? "var(--color-danger-700)"
                  : "var(--color-success-700)",
              }}
            />
            {previewErr ? "Render error" : "Renders cleanly"}
            <span
              className="mono"
              style={{ marginLeft: "auto", color: "var(--color-ink-400)" }}
            >
              600 × 700 · mobile-safe
            </span>
          </div>
          {previewErr ? (
            <div
              style={{
                flex: 1,
                padding: 16,
                background: "var(--color-danger-50)",
                color: "var(--color-danger-700)",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                borderRadius: 6,
                whiteSpace: "pre-wrap",
              }}
            >
              {previewErr}
            </div>
          ) : (
            <iframe
              srcDoc={previewHtml}
              style={{
                width: "100%",
                flex: 1,
                border: "1px solid var(--color-ink-100)",
                borderRadius: 6,
                background: "#fff",
                minHeight: 480,
              }}
              sandbox=""
            />
          )}
        </div>
      </div>
    </div>
  );
}
