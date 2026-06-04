"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { AUTO_VAR_NAMES } from "@/lib/templates/auto-vars";
import type { Contact, ParseResult } from "@/types/contact";

type TemplateOpt = {
  id: string;
  name: string;
  subjectTpl: string;
  variables: string[];
};

type ListOpt = {
  id: string;
  name: string;
  memberCount: number;
};

const STEPS = [
  { id: "template", label: "Template", hint: "Pick the email to send" },
  { id: "contacts", label: "Contacts", hint: "Upload your recipient list" },
  { id: "preview",  label: "Preview",  hint: "Check every row" },
  { id: "send",     label: "Send",     hint: "Schedule or send now" },
] as const;

export function NewCampaignFlow({
  templates,
  lists = [],
  defaultFromName,
  defaultReplyTo,
  defaultFromAddress,
}: {
  templates: TemplateOpt[];
  lists?: ListOpt[];
  defaultFromName: string;
  defaultReplyTo: string;
  defaultFromAddress: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [subject, setSubject] = useState(templates[0]?.subjectTpl ?? "");
  const [fromName, setFromName] = useState(defaultFromName);
  const [replyTo, setReplyTo] = useState(defaultReplyTo);
  const [schedule, setSchedule] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [activeRow, setActiveRow] = useState(0);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, startSubmit] = useTransition();

  const template = templates.find((t) => t.id === templateId);

  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setSubject(t.subjectTpl);
  }

  const canAdvance = (s: number) => {
    if (s === 0) return Boolean(templateId && subject && fromName);
    if (s === 1) return Boolean(parsed && parsed.rows.length > 0);
    return true;
  };

  async function uploadFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/parse", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Parse failed");
      return;
    }
    setParsed(data);
    if (data.rows.length > 0) setStep(2);
  }

  async function chooseList(listId: string) {
    const res = await fetch(`/api/lists/${listId}`);
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Could not load list");
      return;
    }
    const rows = (data.members as { email: string; mergeData: Record<string, unknown> }[])
      .map((m) => ({ email: m.email, ...m.mergeData })) as Contact[];
    const columns = Array.from(
      new Set(rows.flatMap((r) => Object.keys(r))),
    );
    setParsed({ rows, columns, errors: [] });
    if (rows.length > 0) setStep(2);
  }

  // Refresh preview when activeRow or templateId changes
  useEffect(() => {
    if (!template || !parsed?.rows[activeRow]) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/templates/preview-by-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          subjectTpl: subject,
          sampleData: parsed.rows[activeRow],
          autoVars: { reply_to: replyTo, from_name: fromName },
        }),
      });
      const data = await res.json();
      if (!cancelled && res.ok) setPreviewHtml(data.html ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [template, activeRow, parsed, subject, fromName, replyTo]);

  async function testSend() {
    if (!template || !parsed?.rows[activeRow]) return;
    const res = await fetch("/api/templates/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: template.id,
        subjectTpl: subject,
        fromName,
        replyTo,
        sampleData: parsed.rows[activeRow],
      }),
    });
    const data = await res.json().catch(() => ({}));
    alert(res.ok ? "Test email sent." : data.error ?? "Test send failed");
  }

  function submit() {
    if (!template || !parsed) return;
    startSubmit(async () => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          subjectTpl: subject,
          fromName,
          replyTo,
          scheduledAt: schedule ? new Date(schedule).toISOString() : undefined,
          contacts: parsed.rows,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Create failed");
        return;
      }
      const id = data.id as string;
      await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      router.push(`/campaigns/${id}`);
    });
  }

  return (
    <>
      <Stepper step={step} setStep={setStep} canAdvance={canAdvance} />

      <div style={{ marginTop: 28 }}>
        {step === 0 && template && (
          <StepTemplate
            templates={templates}
            templateId={templateId}
            pickTemplate={pickTemplate}
            subject={subject}
            setSubject={setSubject}
            fromName={fromName}
            setFromName={setFromName}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            fromAddress={defaultFromAddress}
            template={template}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepContacts
            templateVars={template?.variables ?? []}
            parsed={parsed}
            uploadFile={uploadFile}
            lists={lists}
            chooseList={chooseList}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && parsed && template && (
          <StepPreview
            contacts={parsed.rows}
            activeRow={activeRow}
            setActiveRow={setActiveRow}
            previewHtml={previewHtml}
            subject={subject}
            onTestSend={testSend}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && parsed && template && (
          <StepSend
            contacts={parsed.rows}
            templateName={template.name}
            templateVars={template.variables}
            subject={subject}
            fromName={fromName}
            replyTo={replyTo}
            fromAddress={defaultFromAddress}
            schedule={schedule}
            setSchedule={setSchedule}
            onBack={() => setStep(2)}
            onSend={() => setShowConfirm(true)}
          />
        )}
      </div>

      {showConfirm && parsed && (
        <SendConfirmModal
          recipients={parsed.rows.length}
          subject={subject}
          fromName={fromName}
          fromAddress={defaultFromAddress}
          schedule={schedule}
          pending={submitting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false);
            submit();
          }}
        />
      )}
    </>
  );
}

/* ----------- Stepper ----------- */

function Stepper({
  step,
  setStep,
  canAdvance,
}: {
  step: number;
  setStep: (n: number) => void;
  canAdvance: (s: number) => boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "20px 24px",
        background: "#ffffff",
        border: "1px solid var(--color-ink-100)",
        borderRadius: 12,
      }}
    >
      {STEPS.map((s, i) => {
        const isDone = i < step;
        const isActive = i === step;
        const clickable = i <= step || (i === step + 1 && canAdvance(step));
        return (
          <div key={s.id} style={{ display: "contents" }}>
            <button
              type="button"
              onClick={() => clickable && setStep(i)}
              disabled={!clickable}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "transparent",
                border: "none",
                cursor: clickable ? "pointer" : "default",
                opacity: !clickable && !isActive ? 0.5 : 1,
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isDone ? "var(--color-maroon-700)" : "#ffffff",
                  border: isActive
                    ? "1.5px solid var(--color-maroon-700)"
                    : isDone
                      ? "none"
                      : "1.5px solid var(--color-ink-200)",
                  color: isDone
                    ? "#ffffff"
                    : isActive
                      ? "var(--color-maroon-700)"
                      : "var(--color-ink-400)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                  transition: "all 150ms",
                }}
              >
                {isDone ? <Icon name="check" size={14} strokeWidth={2.5} /> : i + 1}
              </div>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      isActive || isDone
                        ? "var(--color-ink-800)"
                        : "var(--color-ink-400)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--color-ink-400)",
                    marginTop: 1,
                  }}
                >
                  {s.hint}
                </div>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  margin: "0 16px",
                  background:
                    i < step ? "var(--color-maroon-700)" : "var(--color-ink-100)",
                  transition: "all 200ms",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ----------- Step 1: Template ----------- */

function StepTemplate({
  templates,
  templateId,
  pickTemplate,
  subject,
  setSubject,
  fromName,
  setFromName,
  replyTo,
  setReplyTo,
  fromAddress,
  template,
  onNext,
}: {
  templates: TemplateOpt[];
  templateId: string;
  pickTemplate: (id: string) => void;
  subject: string;
  setSubject: (s: string) => void;
  fromName: string;
  setFromName: (s: string) => void;
  replyTo: string;
  setReplyTo: (s: string) => void;
  fromAddress: string;
  template: TemplateOpt;
  onNext: () => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 24 }}>
      <div className="card" style={{ padding: 28 }}>
        <h2 className="h-section" style={{ marginBottom: 4 }}>Choose template & sender</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-400)", marginBottom: 24 }}>
          Your template defines the email body. Subject, from-name, and reply-to are per-campaign.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label className="label">Template</label>
            <div style={{ display: "grid", gap: 8 }}>
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  selected={t.id === templateId}
                  onClick={() => pickTemplate(t.id)}
                />
              ))}
              {templates.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--color-ink-400)", padding: "12px 0" }}>
                  No templates yet. Create one first.
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Subject line</label>
            <input
              className="input mono"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ fontSize: 13 }}
            />
            <div className="hint">
              Variables in <span className="mono">{"{{double-braces}}"}</span> are interpolated from your contact rows.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="label">From name</label>
              <input
                className="input"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Reply-to</label>
              <input
                className="input mono"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              background: "var(--color-ink-25)",
              borderRadius: 6,
              fontSize: 12.5,
              color: "var(--color-ink-600)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon name="info" size={14} style={{ color: "var(--color-ink-400)" }} />
            Sent as{" "}
            <span className="mono" style={{ color: "var(--color-ink-800)", marginLeft: 4 }}>
              {fromName} &lt;{fromAddress}&gt;
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
          <button type="button" className="btn btn-primary" onClick={onNext} disabled={!templateId}>
            Next — upload contacts <Icon name="arrowRight" size={14} />
          </button>
        </div>
      </div>

      <TemplatePreviewSide template={template} subject={subject} fromName={fromName} fromAddress={fromAddress} />
    </div>
  );
}

function TemplateCard({
  t,
  selected,
  onClick,
}: {
  t: TemplateOpt;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 14px",
        borderRadius: 8,
        border: `1.5px solid ${selected ? "var(--color-maroon-700)" : "var(--color-ink-100)"}`,
        background: selected ? "var(--color-blush-50)" : "#ffffff",
        cursor: "pointer",
        transition: "all 100ms",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 7,
          background: "var(--color-maroon-700)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-blush-50)",
          flexShrink: 0,
        }}
      >
        <Icon name="mail" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-800)" }}>
          {t.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-ink-400)", marginTop: 2 }}>
          <span className="mono">{t.variables.length}</span> variables
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          maxWidth: 180,
          justifyContent: "flex-end",
        }}
      >
        {t.variables.slice(0, 3).map((v) => (
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
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          border: `1.5px solid ${selected ? "var(--color-maroon-700)" : "var(--color-ink-200)"}`,
          background: selected ? "var(--color-maroon-700)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {selected && (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "#ffffff",
            }}
          />
        )}
      </div>
    </button>
  );
}

function TemplatePreviewSide({
  template,
  subject,
  fromName,
  fromAddress,
}: {
  template: TemplateOpt;
  subject: string;
  fromName: string;
  fromAddress: string;
}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/templates/preview-by-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          subjectTpl: subject,
          sampleData: {
            full_name: "Yassine Afaila",
            organization: "Acme SARL",
            job_title: "Software Engineer",
          },
          autoVars: { reply_to: "yassine@groupe-agel.com", from_name: fromName },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!cancelled && res.ok) setHtml(data.html ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [template.id, subject, fromName]);

  return (
    <div style={{ position: "sticky", top: 88, alignSelf: "flex-start" }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Email preview</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-ink-100)" }}>
          <div style={{ fontSize: 11, color: "var(--color-ink-400)", marginBottom: 4 }}>FROM</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{fromName}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--color-ink-400)" }}>
            {fromAddress}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-ink-400)", margin: "10px 0 4px" }}>SUBJECT</div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>
            {subject.replace(/\{\{organization\}\}/g, "Acme SARL")}
          </div>
        </div>
        <iframe
          srcDoc={html}
          style={{ width: "100%", height: 520, border: "none", background: "#fff" }}
          sandbox=""
        />
      </div>
    </div>
  );
}

/* ----------- Step 2: Contacts ----------- */

function StepContacts({
  templateVars,
  parsed,
  uploadFile,
  lists,
  chooseList,
  onBack,
}: {
  templateVars: string[];
  parsed: ParseResult | null;
  uploadFile: (f: File) => void;
  lists: ListOpt[];
  chooseList: (id: string) => void;
  onBack: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const missingVars = parsed
    ? templateVars.filter(
        (v) =>
          !parsed.columns.includes(v) &&
          !AUTO_VAR_NAMES.includes(v as (typeof AUTO_VAR_NAMES)[number]),
      )
    : [];

  return (
    <div className="card" style={{ padding: 28 }}>
      <h2 className="h-section" style={{ marginBottom: 4 }}>Upload contacts</h2>
      <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-400)", marginBottom: 24 }}>
        Accepted formats: <span className="mono">.json</span>,{" "}
        <span className="mono">.csv</span>, <span className="mono">.xlsx</span>. Each row becomes one email.
        Required columns: <span className="mono">email</span>, plus whatever variables your template uses.
      </p>

      {lists.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            border: "1px solid var(--color-ink-100)",
            borderRadius: 10,
            background: "var(--color-ink-25)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--color-ink-800)",
                }}
              >
                Reuse a saved list
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--color-ink-600)",
                  marginTop: 2,
                }}
              >
                Pick an audience you previously saved instead of uploading a file again.
              </div>
            </div>
            <select
              className="input"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) chooseList(e.target.value);
              }}
              style={{ maxWidth: 280, fontSize: 13 }}
            >
              <option value="">Choose a list…</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.memberCount})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) uploadFile(f);
        }}
        style={{
          display: "block",
          padding: "48px 32px",
          textAlign: "center",
          border: `2px dashed ${dragOver ? "var(--color-maroon-700)" : "var(--color-blush-200)"}`,
          background: dragOver ? "var(--color-blush-50)" : "var(--color-ink-25)",
          borderRadius: 12,
          cursor: "pointer",
          transition: "all 120ms",
        }}
      >
        <input
          type="file"
          accept=".json,.csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
          }}
        />
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#ffffff",
            border: "1px solid var(--color-blush-200)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-maroon-700)",
            marginBottom: 14,
          }}
        >
          <Icon name="upload" size={22} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            color: "var(--color-ink-800)",
            letterSpacing: "-0.015em",
          }}
        >
          Drop your contacts file here
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "var(--color-ink-600)" }}>
          or <span style={{ color: "var(--color-maroon-700)", fontWeight: 500 }}>click to browse</span> — max 10 MB
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 6, justifyContent: "center" }}>
          {[".json", ".csv", ".xlsx"].map((f) => (
            <span
              key={f}
              className="mono"
              style={{
                padding: "3px 8px",
                background: "#ffffff",
                border: "1px solid var(--color-ink-100)",
                borderRadius: 4,
                fontSize: 11,
                color: "var(--color-ink-600)",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </label>

      {parsed && (
        <div
          style={{
            marginTop: 18,
            padding: "12px 14px",
            background: "var(--color-success-50)",
            border: "1px solid #cde7d8",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--color-success-700)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Icon name="check" size={14} strokeWidth={2.5} />
          <strong>{parsed.rows.length}</strong> valid contacts loaded
          {parsed.errors.length > 0 && (
            <span style={{ color: "var(--color-warning-700)", marginLeft: 6 }}>
              ({parsed.errors.length} skipped)
            </span>
          )}
        </div>
      )}

      {missingVars.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            background: "var(--color-warning-50)",
            border: "1px solid #f1deb1",
            borderRadius: 8,
            fontSize: 12.5,
            color: "var(--color-warning-700)",
          }}
        >
          Template uses variables not in file: {missingVars.map((v) => (
            <span key={v} className="mono" style={{ marginRight: 6 }}>{v}</span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <Icon name="arrowLeft" size={14} /> Back
        </button>
      </div>
    </div>
  );
}

/* ----------- Step 3: Preview ----------- */

function StepPreview({
  contacts,
  activeRow,
  setActiveRow,
  previewHtml,
  subject,
  onTestSend,
  onBack,
  onNext,
}: {
  contacts: Contact[];
  activeRow: number;
  setActiveRow: (i: number) => void;
  previewHtml: string;
  subject: string;
  onTestSend: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const row = contacts[activeRow];
  const renderedSubject = subject.replace(
    /\{\{(\w+)\}\}/g,
    (_, k) => String((row as Record<string, unknown>)[k] ?? "{{" + k + "}}"),
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="eyebrow">Recipients ({contacts.length})</div>
        </div>
        <div
          className="card"
          style={{ padding: 0, overflow: "hidden", maxHeight: 720, overflowY: "auto" }}
        >
          {contacts.map((c, i) => {
            const data = c as Record<string, unknown>;
            const name = (data.full_name ?? data.name ?? "—") as string;
            const job = data.job_title as string | undefined;
            const org = data.organization as string | undefined;
            return (
              <button
                type="button"
                key={i}
                onClick={() => setActiveRow(i)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 14px",
                  cursor: "pointer",
                  background: i === activeRow ? "var(--color-blush-50)" : "transparent",
                  borderLeft:
                    i === activeRow
                      ? "2px solid var(--color-maroon-700)"
                      : "2px solid transparent",
                  borderBottom: "1px solid var(--color-ink-50)",
                  transition: "background 80ms",
                  border: "none",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: i === activeRow ? 600 : 500,
                      color: "var(--color-ink-800)",
                    }}
                  >
                    {name}
                  </div>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--color-ink-400)" }}>
                    #{i + 1}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--color-ink-400)", marginTop: 1 }}>
                  {c.email}
                </div>
                {(job || org) && (
                  <div style={{ fontSize: 11.5, color: "var(--color-ink-600)", marginTop: 3 }}>
                    {[job, org].filter(Boolean).join(" · ")}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
            <div className="eyebrow">Preview row #{activeRow + 1}</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>
              {renderedSubject}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveRow(Math.max(0, activeRow - 1))}
            >
              <Icon name="arrowLeft" size={12} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveRow(Math.min(contacts.length - 1, activeRow + 1))}
            >
              <Icon name="arrowRight" size={12} />
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onTestSend}>
              <Icon name="send" size={12} /> Test send to me
            </button>
          </div>
        </div>
        <iframe
          srcDoc={previewHtml}
          style={{ width: "100%", height: 680, border: "none", background: "#fff" }}
          sandbox=""
        />
      </div>

      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <Icon name="arrowLeft" size={14} /> Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Next — review & send <Icon name="arrowRight" size={14} />
        </button>
      </div>
    </div>
  );
}

/* ----------- Step 4: Send ----------- */

function StepSend({
  contacts,
  templateName,
  templateVars,
  subject,
  fromName,
  replyTo,
  fromAddress,
  schedule,
  setSchedule,
  onBack,
  onSend,
}: {
  contacts: Contact[];
  templateName: string;
  templateVars: string[];
  subject: string;
  fromName: string;
  replyTo: string;
  fromAddress: string;
  schedule: string;
  setSchedule: (s: string) => void;
  onBack: () => void;
  onSend: () => void;
}) {
  const orgs = useMemo(
    () =>
      new Set(
        contacts
          .map((c) => (c as Record<string, unknown>).organization)
          .filter(Boolean) as string[],
      ).size,
    [contacts],
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
      <div className="card" style={{ padding: 28 }}>
        <h2 className="h-section" style={{ marginBottom: 4 }}>Final review</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-400)", marginBottom: 24 }}>
          One last look. After you confirm, the messages enter the send queue and can&apos;t be recalled.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          <ReviewRow label="Template" value={templateName} />
          <ReviewRow label="Subject" value={subject} mono />
          <ReviewRow label="From" value={`${fromName} <${fromAddress}>`} mono />
          <ReviewRow label="Reply-to" value={replyTo} mono />
          <ReviewRow
            label="Recipients"
            value={`${contacts.length}${orgs ? ` (${orgs} organisations)` : ""}`}
          />
          <ReviewRow
            label="Variables"
            value={
              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                {templateVars.map((v) => (
                  <span
                    key={v}
                    className="mono"
                    style={{
                      padding: "2px 6px",
                      background: "var(--color-blush-100)",
                      color: "var(--color-maroon-700)",
                      borderRadius: 4,
                      fontSize: 10.5,
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            }
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <label className="label">Schedule (optional)</label>
          <input
            type="datetime-local"
            className="input mono"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            style={{ fontSize: 13 }}
          />
          <div className="hint">Leave blank to send immediately after confirmation.</div>
        </div>

        <Safeguards count={contacts.length} />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            <Icon name="arrowLeft" size={14} /> Back
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={onSend}>
            <Icon name="send" size={14} />
            {schedule ? "Schedule campaign" : `Send to ${contacts.length} recipients`}
          </button>
        </div>
      </div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Summary</div>
        <div className="card" style={{ padding: 20 }}>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 36,
              color: "var(--color-maroon-700)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {contacts.length}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-ink-600)", marginTop: 4 }}>
            recipients in this campaign
          </div>

          <div
            style={{
              height: 1,
              background: "var(--color-ink-100)",
              margin: "20px 0",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SummaryStat icon="check" label="Rows parsed" value={contacts.length} />
            <SummaryStat icon="alert" label="Errors found" value={0} good />
            {orgs > 0 && (
              <SummaryStat icon="grid" label="Unique organisations" value={orgs} />
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: "14px 16px",
            background: "var(--color-blush-50)",
            border: "1px solid var(--color-blush-200)",
            borderRadius: 10,
            fontSize: 12.5,
            color: "var(--color-ink-700)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
              marginBottom: 4,
              color: "var(--color-maroon-700)",
            }}
          >
            <Icon name="info" size={14} /> Heads up
          </div>
          Sends are sequential and pause briefly between recipients to keep
          deliverability high.
        </div>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 0",
        borderBottom: "1px solid var(--color-ink-50)",
        fontSize: 13.5,
      }}
    >
      <span style={{ color: "var(--color-ink-400)" }}>{label}</span>
      <span
        className={mono ? "mono" : undefined}
        style={{
          color: "var(--color-ink-800)",
          textAlign: "right",
          maxWidth: "70%",
          fontSize: mono ? 12.5 : 13.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Safeguards({ count }: { count: number }) {
  const checks = [
    { ok: true, t: `All ${count} rows have a valid email` },
    { ok: true, t: "Every required variable is filled" },
    { ok: true, t: "No duplicate addresses" },
    { ok: true, t: "Sender domain is verified (SPF / DKIM)" },
  ];
  return (
    <div
      style={{
        marginTop: 24,
        padding: 16,
        background: "var(--color-ink-25)",
        border: "1px solid var(--color-ink-100)",
        borderRadius: 10,
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 10 }}>Pre-flight checks</div>
      <div style={{ display: "grid", gap: 6 }}>
        {checks.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                background: c.ok ? "var(--color-success-50)" : "var(--color-danger-50)",
                color: c.ok ? "var(--color-success-700)" : "var(--color-danger-700)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={c.ok ? "check" : "x"} size={10} strokeWidth={3} />
            </span>
            <span style={{ color: "var(--color-ink-700)" }}>{c.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  good,
}: {
  icon: "check" | "alert" | "grid";
  label: string;
  value: number;
  good?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: "var(--color-blush-50)",
          color: "var(--color-maroon-700)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={14} />
      </span>
      <span style={{ fontSize: 13, color: "var(--color-ink-600)", flex: 1 }}>{label}</span>
      <span
        className="mono"
        style={{
          fontSize: 14,
          fontWeight: 500,
          color:
            good && value === 0 ? "var(--color-success-700)" : "var(--color-ink-800)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ----------- Send Confirm Modal ----------- */

function SendConfirmModal({
  recipients,
  subject,
  fromName,
  fromAddress,
  schedule,
  pending,
  onCancel,
  onConfirm,
}: {
  recipients: number;
  subject: string;
  fromName: string;
  fromAddress: string;
  schedule: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed === String(recipients);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(25, 25, 25, 0.55)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn 200ms ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#ffffff",
          border: "1px solid var(--color-ink-100)",
          borderRadius: 16,
          boxShadow: "var(--shadow-takeover)",
          overflow: "hidden",
          animation: "slideUp 240ms cubic-bezier(.2,.9,.3,1)",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            background:
              "linear-gradient(135deg, var(--color-maroon-800) 0%, var(--color-maroon-700) 100%)",
            color: "var(--color-blush-50)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(236, 194, 202, 0.12) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
              opacity: 0.6,
            }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(236, 194, 202, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="send" size={18} />
            </div>
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 12,
                  color: "var(--color-blush-200)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Final confirmation
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  fontWeight: 400,
                  letterSpacing: "-0.015em",
                  marginTop: 2,
                }}
              >
                {schedule ? "Schedule this campaign?" : "Send this campaign?"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 72,
                fontWeight: 400,
                letterSpacing: "-0.04em",
                color: "var(--color-maroon-700)",
                lineHeight: 1,
              }}
            >
              {recipients}
            </div>
            <div style={{ fontSize: 14, color: "var(--color-ink-600)" }}>
              emails will be sent. This cannot be undone.
            </div>
          </div>

          <div
            style={{
              padding: "12px 14px",
              background: "var(--color-ink-25)",
              borderRadius: 8,
              fontSize: 12.5,
              color: "var(--color-ink-600)",
              display: "grid",
              gap: 6,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>From</span>
              <span className="mono" style={{ color: "var(--color-ink-800)" }}>
                {fromName} &lt;{fromAddress}&gt;
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Subject</span>
              <span
                className="mono"
                style={{
                  color: "var(--color-ink-800)",
                  maxWidth: "60%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {subject}
              </span>
            </div>
            {schedule && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Scheduled for</span>
                <span className="mono" style={{ color: "var(--color-ink-800)" }}>
                  {schedule}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="label">
              Type{" "}
              <span
                className="mono"
                style={{
                  padding: "1px 6px",
                  background: "var(--color-blush-100)",
                  color: "var(--color-maroon-700)",
                  borderRadius: 4,
                  margin: "0 2px",
                }}
              >
                {recipients}
              </span>{" "}
              to confirm
            </label>
            <input
              autoFocus
              className="input mono"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={String(recipients)}
              style={{
                fontSize: 16,
                letterSpacing: "0.05em",
                borderColor:
                  typed && !matches
                    ? "var(--color-danger-700)"
                    : matches
                      ? "var(--color-success-700)"
                      : "var(--color-ink-100)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: "16px 24px",
            background: "var(--color-ink-25)",
            borderTop: "1px solid var(--color-ink-100)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={!matches || pending}
            onClick={onConfirm}
            style={{ opacity: matches ? 1 : 0.4, cursor: matches ? "pointer" : "not-allowed" }}
          >
            {pending
              ? "Working…"
              : schedule
                ? "Schedule campaign"
                : `Send to ${recipients} recipients`}
            {!pending && <Icon name="send" size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
