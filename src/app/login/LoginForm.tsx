"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="next" value={next} />

      <div>
        <label className="label">Work email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="input"
          placeholder="you@groupe-agel.com"
        />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label className="label">Password</label>
          <span style={{ fontSize: 12, color: "var(--color-maroon-700)" }}>Reset</span>
        </div>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          placeholder="••••••••••"
        />
      </div>

      {state?.error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            background: "var(--color-danger-50)",
            borderRadius: 6,
            border: "1px solid #f3c5c0",
            color: "var(--color-danger-700)",
            fontSize: 13,
          }}
        >
          <Icon name="alert" size={14} />
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary btn-lg"
      style={{ marginTop: 4, width: "100%" }}
    >
      {pending ? "Signing in…" : (
        <>
          Continue
          <Icon name="arrowRight" size={14} />
        </>
      )}
    </button>
  );
}
