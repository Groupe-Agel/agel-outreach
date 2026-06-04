import { parse as parseCsv } from "papaparse";
import * as XLSX from "xlsx";
import type { ParseResult, Contact } from "@/types/contact";
import { isValidEmail, normalizeEmail } from "@/lib/email";

const EMAIL_KEYS = [
  "email",
  "Email",
  "EMAIL",
  "e-mail",
  "E-mail",
  "email_address",
  "EmailAddress",
];

function findEmail(row: Record<string, unknown>): string | null {
  for (const k of EMAIL_KEYS) {
    const v = row[k];
    if (typeof v === "string" && isValidEmail(v)) return normalizeEmail(v);
  }
  for (const v of Object.values(row)) {
    if (typeof v === "string" && isValidEmail(v)) return normalizeEmail(v);
  }
  return null;
}

function normalize(rows: Record<string, unknown>[]): ParseResult {
  const errors: ParseResult["errors"] = [];
  const out: Contact[] = [];
  const colSet = new Set<string>();
  rows.forEach((r, i) => {
    Object.keys(r).forEach((k) => colSet.add(k));
    const email = findEmail(r);
    if (!email) {
      errors.push({ row: i + 1, message: "Missing or invalid email" });
      return;
    }
    out.push({ ...r, email });
  });
  return { rows: out, columns: [...colSet], errors };
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json")) return parseJsonFile(file);
  if (name.endsWith(".csv")) return parseCsvFile(file);
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseXlsxFile(file);
  throw new Error("Unsupported file type. Use .json, .csv, .xlsx, or .xls");
}

async function parseJsonFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of objects");
  return normalize(data as Record<string, unknown>[]);
}

async function parseCsvFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  const parsed = parseCsv<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return normalize(parsed.data);
}

async function parseXlsxFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], columns: [], errors: [] };
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
  });
  return normalize(rows);
}

/**
 * Parse a raw text payload when the file came over the wire as a string
 * (used by the REST API where the client supplies `contacts: [...]` directly).
 */
export function normalizeContacts(
  data: unknown,
): ParseResult {
  if (!Array.isArray(data)) {
    throw new Error("contacts must be an array of objects");
  }
  return normalize(data as Record<string, unknown>[]);
}
