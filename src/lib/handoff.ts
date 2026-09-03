import type { AssetClass, Goal, Holding, Loan, LoanKind, Profile } from "../types";
import { emptyProfile } from "../store/seed";
import { ASSET_CLASSES } from "./portfolio";

/**
 * Portable financial positions.
 *
 * A WebMCP tool runs inside one person's browser session, which normally means
 * an agent's understanding of your finances dies with the tab. A handoff
 * packet encodes the whole profile into a URL fragment, so one person's agent
 * can hand a position to another person's agent -- a partner, an advisor, a
 * friend who asked for a second opinion -- and that agent resumes reasoning on
 * exactly the same live state, with its own tools, in its own session.
 *
 * The fragment never leaves the browser as a network request: everything after
 * '#' is not sent to the server, so a position is shared peer-to-peer through
 * the link itself rather than through any backend we run.
 */

const VERSION = 1;
export const HANDOFF_KEY = "pos";

export interface HandoffPacket {
  v: number;
  at: number;
  from: string;
  note: string;
  profile: Profile;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, transform: "gzip" | "gunzip"): Promise<Uint8Array> {
  const cs =
    transform === "gzip" ? new CompressionStream("gzip") : new DecompressionStream("gzip");
  // Copy into a plain ArrayBuffer-backed view so the Blob constructor accepts it
  // regardless of how the caller's Uint8Array was allocated.
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const stream = new Blob([copy.buffer as ArrayBuffer]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const gzip = (b: Uint8Array) => pipe(b, "gzip");
const gunzip = (b: Uint8Array) => pipe(b, "gunzip");

export async function encodeHandoff(profile: Profile, from: string, note: string): Promise<string> {
  const packet: HandoffPacket = { v: VERSION, at: Date.now(), from, note, profile };
  const json = new TextEncoder().encode(JSON.stringify(packet));
  return toBase64Url(await gzip(json));
}

export async function decodeHandoff(encoded: string): Promise<HandoffPacket> {
  const raw = await gunzip(fromBase64Url(encoded));
  const parsed = JSON.parse(new TextDecoder().decode(raw));
  if (!parsed || typeof parsed !== "object") throw new Error("Not a valid position packet.");
  if (parsed.v !== VERSION) {
    throw new Error(`This link was made by a different version of the app (v${parsed.v}).`);
  }
  return {
    v: VERSION,
    at: Number(parsed.at) || Date.now(),
    from: text(parsed.from, 80) || "someone",
    note: text(parsed.note, 400),
    profile: sanitizeProfile(parsed.profile),
  };
}

/* ---------------------------------------------------------------------------
 * Everything below treats the decoded packet as untrusted input. A handoff link
 * can be constructed by anyone, so nothing from it is used without being
 * coerced to the expected type, bounded, and clamped. Numbers become finite
 * numbers, strings are truncated, and collections are capped so a hostile or
 * corrupted link degrades into a boring profile rather than a broken or
 * unresponsive app.
 * ------------------------------------------------------------------------- */

const MAX_ITEMS = 40;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function num(v: unknown, fallback = 0, min = -1e15, max = 1e15): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function list<T>(v: unknown, map: (item: any, i: number) => T): T[] {
  return Array.isArray(v) ? v.slice(0, MAX_ITEMS).map(map) : [];
}

const LOAN_KINDS: LoanKind[] = ["home", "auto", "education", "personal", "credit_card", "other"];

export function sanitizeProfile(raw: unknown): Profile {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Record<string, unknown>;
  const budget = (p.budget ?? {}) as Record<string, unknown>;

  return {
    currency: text(p.currency, 8) === "USD" ? "USD" : "INR",
    // A received position is somebody's real data, never sample data, however
    // the sender's copy was flagged.
    isSample: false,
    expectedPortfolioReturnPct: num(p.expectedPortfolioReturnPct, 11, -20, 40),
    loans: list<Loan>(p.loans, (l, i) => ({
      id: text(l?.id, 40) || `loan_${i}`,
      name: text(l?.name, 90) || "Loan",
      kind: LOAN_KINDS.includes(l?.kind) ? l.kind : "other",
      principal: num(l?.principal, 0, 0),
      annualRatePct: num(l?.annualRatePct, 0, 0, 200),
      termMonths: Math.max(1, Math.round(num(l?.termMonths, 12, 1, 600))),
      monthsPaid: Math.max(0, Math.round(num(l?.monthsPaid, 0, 0, 600))),
    })),
    holdings: list<Holding>(p.holdings, (h, i) => ({
      id: text(h?.id, 40) || `h_${i}`,
      symbol: text(h?.symbol, 20) || "ASSET",
      name: text(h?.name, 90) || "Holding",
      assetClass: (ASSET_CLASSES.includes(h?.assetClass) ? h.assetClass : "equity") as AssetClass,
      units: num(h?.units, 0, 0),
      price: num(h?.price, 0, 0),
    })),
    realAssets: list(p.realAssets, (a, i) => ({
      id: text(a?.id, 40) || `ra_${i}`,
      name: text(a?.name, 90) || "Asset",
      value: num(a?.value, 0, 0),
    })),
    goals: list<Goal>(p.goals, (g, i) => ({
      id: text(g?.id, 40) || `g_${i}`,
      name: text(g?.name, 90) || "Goal",
      targetAmount: num(g?.targetAmount, 0, 0),
      targetMonths: Math.max(1, Math.round(num(g?.targetMonths, 12, 1, 1200))),
      savedSoFar: num(g?.savedSoFar, 0, 0),
    })),
    budget: {
      monthlyIncome: num(budget.monthlyIncome, 0, 0),
      cashReserve: num(budget.cashReserve, 0, 0),
      expenses: list(budget.expenses, (e, i) => ({
        id: text(e?.id, 40) || `e_${i}`,
        name: text(e?.name, 90) || "Expense",
        amount: num(e?.amount, 0, 0),
        essential: e?.essential !== false,
      })),
    },
  };
}

export function handoffUrl(encoded: string): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#${HANDOFF_KEY}=${encoded}`;
}

export function readHandoffFromUrl(): string | null {
  const hash = location.hash.replace(/^#/, "");
  const match = new URLSearchParams(hash).get(HANDOFF_KEY);
  return match && match.length > 8 ? match : null;
}
