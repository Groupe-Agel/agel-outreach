"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Contact, ParseResult } from "@/types/contact";
import { AUTO_VAR_NAMES } from "@/lib/templates/auto-vars";

type TemplateOpt = {
  id: string;
  name: string;
  subjectTpl: string;
  variables: string[];
};

export function NewCampaignForm({
  templates,
  defaultReplyTo,
  defaultFromName,
  defaultFromAddress,
}: {
  templates: TemplateOpt[];
  defaultReplyTo: string;
  defaultFromName: string;
  defaultFromAddress: string;
  fromDomain: string;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [fromName, setFromName] = useState(defaultFromName);
  const [replyTo, setReplyTo] = useState(defaultReplyTo);
  const [subjectTpl, setSubjectTpl] = useState(
    templates[0]?.subjectTpl ?? "",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewIdx, setPreviewIdx] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectedTemplate = templates.find((t) => t.id === templateId);

  function changeTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setSubjectTpl(t.subjectTpl);
  }

  async function uploadFile(f: File) {
    setFile(f);
    setParsed(null);
    setPreviewHtml("");
    const form = new FormData();
    form.append("file", f);
    const res = await fetch("/api/parse", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Parse failed");
      return;
    }
    setParsed(data);
    if (data.rows.length > 0) {
      refreshPreview(data.rows[0]);
    }
  }

  async function refreshPreview(row: Contact) {
    if (!selectedTemplate) return;
    const res = await fetch("/api/templates/preview-by-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: selectedTemplate.id,
        subjectTpl,
        sampleData: row,
        autoVars: { reply_to: replyTo, from_name: fromName },
      }),
    });
    const data = await res.json();
    if (res.ok) setPreviewHtml(data.html ?? "");
  }

  function switchPreviewRow(i: number) {
    setPreviewIdx(i);
    if (parsed?.rows[i]) refreshPreview(parsed.rows[i]);
  }

  async function testSend() {
    if (!parsed || parsed.rows.length === 0 || !selectedTemplate) return;
    // Create a campaign in DRAFT just to call /test on it? Easier: pass row directly.
    // Use a dedicated test endpoint with row data, no campaign needed.
    const res = await fetch("/api/templates/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: selectedTemplate.id,
        subjectTpl,
        fromName,
        replyTo,
        sampleData: parsed.rows[previewIdx],
      }),
    });
    const data = await res.json();
    if (res.ok) alert("Test email sent to you.");
    else alert(data.error ?? "Test send failed");
  }

  async function submitCampaign() {
    if (!parsed || !selectedTemplate || parsed.rows.length === 0) return;
    startTransition(async () => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          subjectTpl,
          fromName,
          replyTo,
          scheduledAt: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : undefined,
          contacts: parsed.rows,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Create failed");
        return;
      }
      const id = data.id as string;

      // If immediate, trigger send now
      if (!scheduledAt) {
        await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      } else {
        await fetch(`/api/campaigns/${id}/send`, { method: "POST" }); // will mark SCHEDULED
      }
      router.push(`/campaigns/${id}`);
    });
  }

  const missingVars = selectedTemplate
    ? selectedTemplate.variables.filter(
        (v) =>
          !(parsed?.columns ?? []).includes(v) &&
          !AUTO_VAR_NAMES.includes(v as (typeof AUTO_VAR_NAMES)[number]),
      )
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: form */}
      <div className="space-y-4">
        <Field label="Template">
          <select
            className="input"
            value={templateId}
            onChange={(e) => changeTemplate(e.target.value)}
          >
            {templates.length === 0 && <option value="">No templates</option>}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subject">
          <input
            className="input font-mono text-sm"
            value={subjectTpl}
            onChange={(e) => setSubjectTpl(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From name">
            <input
              className="input"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
            <div className="text-xs text-ink-400 mt-1">
              Sent as:{" "}
              <code>
                {fromName} &lt;{defaultFromAddress}&gt;
              </code>
            </div>
          </Field>
          <Field label="Reply-to">
            <input
              className="input"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Schedule (optional)">
          <input
            className="input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <div className="text-xs text-ink-400 mt-1">
            Leave blank to send immediately.
          </div>
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
          <>
            <div className="rounded-md border border-blush-200 p-3 text-sm">
              <strong>{parsed.rows.length}</strong> valid contacts
              {parsed.errors.length > 0 && (
                <>
                  ,{" "}
                  <span className="text-red-600">
                    {parsed.errors.length} skipped
                  </span>
                </>
              )}
              <div className="text-xs text-ink-400 mt-1">
                Columns: {parsed.columns.join(", ")}
              </div>
              {missingVars.length > 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  Template uses variables not in file: {missingVars.join(", ")}
                </div>
              )}
            </div>

            <div className="max-h-60 overflow-auto border border-blush-200 rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-blush-100/30">
                  <tr>
                    {parsed.columns.map((c) => (
                      <th
                        key={c}
                        className="text-left px-2 py-1 font-medium text-ink-700"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blush-200/60">
                  {parsed.rows.map((r, i) => (
                    <tr
                      key={i}
                      onClick={() => switchPreviewRow(i)}
                      className={
                        "cursor-pointer " +
                        (i === previewIdx
                          ? "bg-blush-200"
                          : "hover:bg-blush-100/50")
                      }
                    >
                      {parsed.columns.map((c) => (
                        <td key={c} className="px-2 py-1 truncate max-w-[140px]">
                          {String(r[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button onClick={testSend} className="btn-secondary">
                Send test to me
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="btn-primary"
                disabled={parsed.rows.length === 0}
              >
                {scheduledAt
                  ? `Schedule for ${new Date(scheduledAt).toLocaleString()}`
                  : `Send to ${parsed.rows.length}`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: live preview */}
      <div className="space-y-2 sticky top-4">
        <div className="text-xs uppercase tracking-wide text-ink-400">
          Preview {parsed?.rows[previewIdx]?.email ? `· ${parsed.rows[previewIdx].email}` : ""}
        </div>
        <div className="h-[700px] border border-blush-200 rounded-md overflow-hidden bg-white">
          {previewHtml ? (
            <iframe srcDoc={previewHtml} className="w-full h-full" sandbox="" />
          ) : (
            <div className="h-full grid place-items-center text-sm text-ink-400">
              Upload contacts to preview
            </div>
          )}
        </div>
      </div>

      {showConfirm && parsed && (
        <ConfirmModal
          count={parsed.rows.length}
          subject={subjectTpl}
          fromName={fromName}
          fromAddress={defaultFromAddress}
          scheduledAt={scheduledAt}
          onCancel={() => {
            setShowConfirm(false);
            setConfirmText("");
          }}
          onConfirm={() => {
            setShowConfirm(false);
            submitCampaign();
          }}
          confirmText={confirmText}
          setConfirmText={setConfirmText}
          pending={pending}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-ink-400 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function ConfirmModal({
  count,
  subject,
  fromName,
  fromAddress,
  scheduledAt,
  onCancel,
  onConfirm,
  confirmText,
  setConfirmText,
  pending,
}: {
  count: number;
  subject: string;
  fromName: string;
  fromAddress: string;
  scheduledAt: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText: string;
  setConfirmText: (s: string) => void;
  pending: boolean;
}) {
  const expected = String(count);
  const ok = confirmText === expected;
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-blush-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold">
          {scheduledAt ? "Schedule send" : "Confirm send"}
        </h3>
        <dl className="text-sm space-y-1">
          <Row k="Recipients" v={count.toString()} />
          <Row k="Subject" v={subject} />
          <Row k="From" v={`${fromName} <${fromAddress}>`} />
          {scheduledAt && (
            <Row k="When" v={new Date(scheduledAt).toLocaleString()} />
          )}
        </dl>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-ink-400">
            Type the recipient count ({expected}) to confirm
          </label>
          <input
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expected}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!ok || pending}
            className="btn-primary"
          >
            {pending
              ? "Working…"
              : scheduledAt
                ? "Schedule"
                : "Send now"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-ink-400 w-24">{k}</dt>
      <dd className="font-medium break-all">{v}</dd>
    </div>
  );
}
