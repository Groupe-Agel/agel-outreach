/**
 * Variables auto-provided by the campaign (not pulled from contact rows).
 * Templates may reference these and the UI must not warn about them being
 * missing from the uploaded file.
 */
export const AUTO_VAR_NAMES = ["reply_to", "from_name", "email"] as const;

export type AutoVars = {
  reply_to: string;
  from_name: string;
};

export function withAutoVars(
  row: Record<string, unknown>,
  vars: AutoVars,
): Record<string, unknown> {
  // Row data wins over auto-vars only when the row explicitly sets the key —
  // otherwise the campaign-level value fills in.
  return { ...vars, ...row };
}
