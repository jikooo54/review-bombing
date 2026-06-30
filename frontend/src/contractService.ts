import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { CONTRACT_ADDRESS } from "./chain";

type Hex = `0x${string}`;
const TIMEOUT_MS = 240_000;

export type Verdict = "ORGANIC" | "SUSPICIOUS" | "BOMBING" | "";

// status: 0 SUBMITTED, 1 ANALYSED, 2 RESTORED, 3 CLEARED
// appealState: 0 NONE, 1 UPHELD, 2 OVERTURNED
export interface TicketView {
  submitter: string;
  target: string;
  reviewCount: number;
  displayedRating: number; // stars*100
  reviewsBlob: string;
  counterEvidence: string;
  status: number;
  outcome: Verdict;
  coordinationPct: number;
  temporalPct: number;
  accountPct: number;
  contentPct: number;
  confidence: number;
  fakeCount: number;
  trigger: string;
  severity: string;
  organicRating: number;   // stars*100
  credibility: number;
  appealState: number;
  rationale: string;
}
export interface TicketRow extends TicketView { id: number; }
export interface TargetStats { waves: number; bombings: number; suppressed: number; cleared: number; }

function readClient() { return createClient({ chain: studionet, account: createAccount() }); }
function writeClient(account: Hex) { return createClient({ chain: studionet, account }); }
async function waitAccepted(client: any, hash: Hex) { let timer: ReturnType<typeof setTimeout> | undefined; const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Transaction timed out")), TIMEOUT_MS); }); try { await Promise.race([client.waitForTransactionReceipt({ hash: hash as never, status: TransactionStatus.ACCEPTED, interval: 5000, retries: 64 }), timeout]); } finally { if (timer) clearTimeout(timer); } }
function pick(obj: any, key: string, idx: number): any { if (obj == null) return undefined; if (Array.isArray(obj)) return obj[idx]; if (typeof obj === "object" && key in obj) return obj[key]; return undefined; }
async function send(account: Hex, fn: string, args: any[]): Promise<void> {
  const wc = writeClient(account);
  const h = (await wc.writeContract({ address: CONTRACT_ADDRESS as Hex, functionName: fn, args, value: 0n })) as Hex;
  await waitAccepted(wc, h);
}

export async function submitReviews(account: Hex, target: string, count: number, displayedRating: number, blob: string): Promise<number> {
  await send(account, "submit_reviews", [target.trim(), count, displayedRating, blob.trim()]);
  const c = await getCounts(); return c.next - 1;
}
export async function attachCounterEvidence(account: Hex, id: number, text: string): Promise<void> { await send(account, "attach_counter_evidence", [id, text.trim()]); }
export async function analyse(account: Hex, id: number): Promise<void> { await send(account, "analyse", [id]); }
export async function appeal(account: Hex, id: number): Promise<void> { await send(account, "appeal", [id]); }
export async function restore(account: Hex, id: number): Promise<void> { await send(account, "restore", [id]); }

export async function getTicket(id: number): Promise<TicketView> {
  const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "get_ticket", args: [id] });
  return {
    submitter: String(pick(r, "submitter", 0) ?? ""),
    target: String(pick(r, "target", 1) ?? ""),
    reviewCount: Number(pick(r, "review_count", 2) ?? 0),
    displayedRating: Number(pick(r, "displayed_rating", 3) ?? 0),
    reviewsBlob: String(pick(r, "reviews_blob", 4) ?? ""),
    counterEvidence: String(pick(r, "counter_evidence", 5) ?? ""),
    status: Number(pick(r, "status", 6) ?? 0),
    outcome: String(pick(r, "verdict", 7) ?? "") as Verdict,
    coordinationPct: Number(pick(r, "coordination_pct", 8) ?? 0),
    temporalPct: Number(pick(r, "temporal_pct", 9) ?? 0),
    accountPct: Number(pick(r, "account_pct", 10) ?? 0),
    contentPct: Number(pick(r, "content_pct", 11) ?? 0),
    confidence: Number(pick(r, "confidence", 12) ?? 0),
    fakeCount: Number(pick(r, "fake_count", 13) ?? 0),
    trigger: String(pick(r, "trigger", 14) ?? ""),
    severity: String(pick(r, "severity", 15) ?? ""),
    organicRating: Number(pick(r, "organic_rating", 16) ?? 0),
    credibility: Number(pick(r, "credibility", 17) ?? 0),
    appealState: Number(pick(r, "appeal_state", 18) ?? 0),
    rationale: String(pick(r, "rationale", 19) ?? ""),
  };
}
export async function getCounts(): Promise<{ next: number; analysed: number; bombing: number; suppressed: number; appeals: number; overturned: number }> {
  const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "get_counts", args: [] });
  const p = String(r).split("||").map((x) => Number(x) || 0);
  return { next: p[0] || 0, analysed: p[1] || 0, bombing: p[2] || 0, suppressed: p[3] || 0, appeals: p[4] || 0, overturned: p[5] || 0 };
}
export async function getTargetStats(target: string): Promise<TargetStats> {
  const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "get_target_stats", args: [target] });
  const p = String(r).split("||").map((x) => Number(x) || 0);
  return { waves: p[0] || 0, bombings: p[1] || 0, suppressed: p[2] || 0, cleared: p[3] || 0 };
}
export async function listAll(maxRows = 80): Promise<TicketRow[]> {
  const { next } = await getCounts(); if (next === 0) return [];
  const ids: number[] = []; for (let i = next - 1; i >= 0 && i >= next - maxRows; i--) ids.push(i);
  const rows = await Promise.all(ids.map(async (id) => { try { const c = await getTicket(id); return { id, ...c }; } catch { return null; } }));
  return rows.filter((r): r is TicketRow => r !== null);
}
