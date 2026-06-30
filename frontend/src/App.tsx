import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { WarningOctagon, MagnifyingGlass, ShieldCheck, Star, PlusCircle, Broadcast, Scales, Gavel } from "@phosphor-icons/react";
import { Hero3D } from "./Hero3D";
import { BgGeo } from "./BgGeo";
import { submitReviews, analyse, restore, attachCounterEvidence, appeal, getTicket, getCounts, listAll, TicketView, TicketRow } from "./contractService";

type Hex = `0x${string}`;
const STATUS_LABEL = ["submitted", "analysed", "restored", "cleared"];
const APPEAL_LABEL = ["", "appeal upheld", "appeal overturned"];
function shortAddr(a: string): string { return a && a.length > 12 ? `${a.slice(0, 6)}\u2026${a.slice(-4)}` : a || "-"; }
function stars(r: number): string { return (r / 100).toFixed(2); }

export function App() {
  const { address, isConnected } = useAccount();
  const acct = address as Hex | undefined;
  const [showSub, setShowSub] = useState(false);
  const [target, setTarget] = useState(""); const [count, setCount] = useState(""); const [rating, setRating] = useState(""); const [blob, setBlob] = useState("");
  const [counter, setCounter] = useState("");
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [counts, setCounts] = useState({ next: 0, analysed: 0, bombing: 0, suppressed: 0, appeals: 0, overturned: 0 });
  const [selId, setSelId] = useState<number | null>(null); const [sel, setSel] = useState<TicketView | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<string | null>(null); const [note, setNote] = useState(""); const [netErr, setNetErr] = useState(false);

  async function refreshAll() { if (typeof document !== "undefined" && document.hidden) return; try { const [c, l] = await Promise.all([getCounts(), listAll(80)]); setCounts(c); setRows(l); if (selId != null) { try { setSel(await getTicket(selId)); } catch {} } setNetErr(false); } catch { setNetErr(true); } finally { setLoading(false); } }
  useEffect(() => { refreshAll(); const t = setInterval(refreshAll, 12000); const onVis = () => { if (!document.hidden) refreshAll(); }; document.addEventListener("visibilitychange", onVis); return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function pick(id: number) { setSelId(id); setCounter(""); try { setSel(await getTicket(id)); } catch { setSel(null); } }
  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> { setBusy(label); setNote(""); try { return await fn(); } catch (e) { setNote(String((e as Error).message || e).slice(0, 200)); return undefined; } finally { setBusy(null); refreshAll(); } }
  async function onSub() { if (!acct) return; if (target.trim().length < 2) return setNote("Target required."); if (!/^\d+$/.test(count.trim())) return setNote("Review count integer."); const rt = Math.round(Number(rating) * 100); if (!(rt >= 0 && rt <= 500)) return setNote("Rating 0-5 stars."); if (blob.trim().length < 30) return setNote("Reviews blob 30+ chars."); const id = await run("Submitting reviews", () => submitReviews(acct!, target, Math.max(1, Math.floor(Number(count) || 1)), rt, blob)); if (id != null) { setSelId(id); setTarget(""); setCount(""); setRating(""); setBlob(""); setShowSub(false); } }
  async function onAnalyse() { if (acct && selId != null) await run("Forensic read (two-pass)", () => analyse(acct!, selId!)); }
  async function onRestore() { if (acct && selId != null) await run("Suppressing fakes + restoring", () => restore(acct!, selId!)); }
  async function onCounter() { if (!acct || selId == null) return; if (counter.trim().length < 20) return setNote("Counter-evidence 20+ chars."); await run("Attaching counter-evidence", () => attachCounterEvidence(acct!, selId!, counter)); setCounter(""); }
  async function onAppeal() { if (acct && selId != null) await run("Appeal referee (re-adjudicating)", () => appeal(acct!, selId!)); }

  const sevClass = (s: string) => (s === "CRITICAL" || s === "SEVERE") ? "BOMBING" : (s === "MODERATE" || s === "LOW") ? "SUSPICIOUS" : "pend";

  return (
    <div className="fs">
      <BgGeo />
      <div className="top">
        <div className="brand"><b>Brigade</b><span>brigade forensics</span></div>
        <div className="top-r"><span className={`live ${netErr ? "off" : ""}`}><i />{netErr ? "reconnecting" : "studionet"}</span><ConnectButton showBalance={false} chainStatus="none" accountStatus="address" /></div>
      </div>

      <section className="hero">
        <Hero3D />
        <div className="hero-in">
          <p className="eyebrow">coordinated-review forensics</p>
          <h1>A flood is not<br />a <em>verdict.</em></h1>
          <p className="lede">A review wave is decomposed into three signals &mdash; timing, accounts, content &mdash; then a two-pass panel sets the coordinated share, names the trigger and recomputes the organic stars. The accused can file counter-evidence and an independent referee can overturn the ruling.</p>
          <p className="src">Corpus on-chain (timestamps, accounts, content), judged via <code>gl.nondet</code>.</p>
        </div>
      </section>

      <div className="stats">
        <div className="stat"><b>{counts.next}</b><span>waves</span></div>
        <div className="stat"><b>{counts.bombing}</b><span>bombing</span></div>
        <div className="stat"><b>{counts.suppressed}</b><span>fakes suppressed</span></div>
        <div className="stat"><b>{counts.overturned}<i>/{counts.appeals}</i></b><span>appeals overturned</span></div>
      </div>

      <div className="sec-h"><Broadcast size={17} weight="bold" /><h2>Review waves</h2><span className="mut">submit / analyse / appeal / restore</span></div>
      {loading ? <div className="skel">{[0, 1, 2].map(i => <div key={i} className="sk" />)}</div>
        : rows.length === 0 ? <div className="empty">No review waves submitted yet.</div>
          : <div className="mkts">{rows.map(r => (
            <button key={r.id} className={`mkt ${selId === r.id ? "on" : ""}`} onClick={() => pick(r.id)}>
              <div className="mkt-h"><span className="mkt-q">{r.target}</span><span className={`tag ${r.outcome || "pend"}`}>{r.outcome || STATUS_LABEL[r.status]}</span></div>
              <div className="coordbar"><i style={{ width: `${Math.min(100, r.coordinationPct)}%` }} /></div>
              <div className="mkt-meta"><span className="mono">{r.reviewCount} reviews</span><span className="mono">{r.coordinationPct}% coordinated</span>{r.severity && r.severity !== "NONE" ? <span className="mono">{r.severity.toLowerCase()}</span> : null}{r.organicRating > 0 ? <span className="mono">{stars(r.displayedRating)}&rarr;{stars(r.organicRating)}&#9733;</span> : null}</div>
            </button>))}</div>}

      {sel && selId != null && (
        <div className="panel">
          <div className="sec-h" style={{ marginTop: 0 }}><WarningOctagon size={16} weight="bold" /><h2>{sel.target}</h2><span className={`tag ${sel.outcome || "pend"}`}>{sel.outcome || STATUS_LABEL[sel.status]}</span>{sel.severity && sel.severity !== "NONE" ? <span className={`tag ${sevClass(sel.severity)}`}>{sel.severity.toLowerCase()}</span> : null}{sel.appealState > 0 ? <span className="tag pend">{APPEAL_LABEL[sel.appealState]}</span> : null}</div>
          {sel.organicRating > 0 && <div className="ratings"><Star size={20} weight="fill" color="#fbbf24" /><span className="r disp">{stars(sel.displayedRating)}</span><span className="arrow">to</span><span className="r org">{stars(sel.organicRating)}</span><span className="quiet">restored organic rating</span></div>}
          {sel.status >= 1 && (
            <div className="signals">
              <div className="sig"><span>timing</span><div className="coordbar sm"><i style={{ width: `${Math.min(100, sel.temporalPct)}%` }} /></div><b className="mono">{sel.temporalPct}%</b></div>
              <div className="sig"><span>accounts</span><div className="coordbar sm"><i style={{ width: `${Math.min(100, sel.accountPct)}%` }} /></div><b className="mono">{sel.accountPct}%</b></div>
              <div className="sig"><span>content</span><div className="coordbar sm"><i style={{ width: `${Math.min(100, sel.contentPct)}%` }} /></div><b className="mono">{sel.contentPct}%</b></div>
            </div>
          )}
          <div className="kv"><span>review count</span><b className="mono">{sel.reviewCount}</b></div>
          <div className="kv"><span>coordination</span><b className="mono">{sel.coordinationPct}% &middot; confidence {sel.confidence}%</b></div>
          <div className="kv"><span>fake reviews</span><b className="mono">{sel.fakeCount}</b></div>
          <div className="kv"><span>trigger</span><b className="mono">{sel.trigger ? sel.trigger.replace(/_/g, " ").toLowerCase() : "-"}</b></div>
          {sel.credibility > 0 && <div className="kv"><span>organic credibility</span><b className="mono">{sel.credibility}%</b></div>}
          {sel.reviewsBlob && <div className="evid"><div className="l">reviews blob</div><pre>{sel.reviewsBlob}</pre></div>}
          {sel.counterEvidence && <div className="evid"><div className="l">counter-evidence</div><pre>{sel.counterEvidence}</pre></div>}
          {sel.rationale && <p className="why">{sel.rationale}</p>}
          <div className="actions">
            {sel.status === 0 && <button className="btn" disabled={!isConnected || !!busy} onClick={onAnalyse}><MagnifyingGlass size={15} weight="bold" /> Forensic read (two-pass)</button>}
            {sel.status === 1 && sel.outcome === "ORGANIC" && <p className="quiet"><ShieldCheck size={15} weight="fill" /> Organic wave. Nothing to suppress.</p>}
            {sel.status === 1 && sel.outcome !== "ORGANIC" && <>
              <button className="btn" disabled={!isConnected || !!busy} onClick={onRestore}><ShieldCheck size={15} weight="bold" /> Suppress fakes + restore</button>
              {sel.appealState === 0 && <div className="defense-form">
                <label>Counter-evidence (the accused replies)</label>
                <textarea value={counter} onChange={e => setCounter(e.target.value)} placeholder="Proof the reviews are genuine: real purchases, organic timing, distinct authors. 20+ chars." />
                <div className="actions">
                  <button className="btn ghost" disabled={!isConnected || !!busy} onClick={onCounter}><Scales size={15} weight="bold" /> Attach counter-evidence</button>
                  <button className="btn" disabled={!isConnected || !!busy || !sel.counterEvidence} onClick={onAppeal}><Gavel size={15} weight="bold" /> Appeal the ruling</button>
                </div>
              </div>}
            </>}
            {sel.status === 2 && <p className="quiet"><ShieldCheck size={15} weight="fill" /> Restored. {sel.fakeCount} fakes suppressed; organic {stars(sel.organicRating)} stars.</p>}
            {sel.status === 3 && <p className="quiet"><Scales size={15} weight="fill" /> Cleared on appeal &mdash; the counter-evidence overturned the ruling.</p>}
          </div>
        </div>
      )}

      <div className="sec-h"><PlusCircle size={17} weight="bold" /><h2>Submit a wave</h2></div>
      {!showSub ? <button className="btn ghost" onClick={() => setShowSub(true)}><PlusCircle size={15} weight="bold" /> New wave</button>
        : <div className="panel">
          <label>Target</label><input value={target} onChange={e => setTarget(e.target.value)} placeholder="business / product / page" />
          <label>Review count</label><input value={count} onChange={e => setCount(e.target.value)} placeholder="e.g. 50" inputMode="numeric" />
          <label>Displayed rating (stars 0-5)</label><input value={rating} onChange={e => setRating(e.target.value)} placeholder="e.g. 1.8" inputMode="decimal" />
          <label>Reviews blob (30+ chars)</label><textarea value={blob} onChange={e => setBlob(e.target.value)} placeholder="Review excerpts: text, dates, account ages, posting times." />
          <button className="btn" disabled={!isConnected || !!busy} onClick={onSub}>{isConnected ? "Submit for judgment" : "Connect a wallet"}</button>
        </div>}

      {netErr && <div className="strip"><WarningOctagon size={14} weight="bold" /> Lost the studionet read; retrying every 12s.</div>}
      <div className="foot"><span>Brigade · on studionet</span><span>{netErr ? "reconnecting" : "live"}</span></div>
      {(busy || note) && <div className="toast">{busy ? `${busy}\u2026` : note}</div>}
    </div>
  );
}
