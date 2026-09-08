"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, CircleAlert, Database, FileCheck2, Fingerprint, LoaderCircle, Radar, RefreshCw, Route, ShieldCheck, Wallet } from "lucide-react";
import { connectWallet, contractAddress, explorerUrl, networkName, readContract, recoverTransaction, txUrl, unwrap, writeContract } from "../../lib/genlayer";

type CaseData = {
  case_id: string; authority: string; owner: string; campaign_ref: string; product_model: string; serial_number: string;
  batch_id: string; purchase_date: string; market_region: string; window_open_at: number; window_close_at: number;
  status: string; route: string; remedy: string; immediate_action: string; dossier_digest: string; accepted_digest: string;
  source_count: number; model_relation: string; serial_relation: string; batch_relation: string; date_relation: string;
  region_relation: string; coverage: string; contradiction: boolean; reason: string;
  remedy_relation: string; action_relation: string;
};
type NoticeData = { publisher_role: string; source_url: string; source_sha256: string; unique_citation: string };

const EMPTY_CASE = { caseId: "RR-48-001", owner: "", campaign: "RR-48", model: "BAT-XR48", serial: "XR48001482", batch: "NS-24-Q2", purchaseDate: "2026-03-14", region: "DEMO-EU" };
const EMPTY_SOURCE = { origin: "https://raw.githubusercontent.com/eaglebooth/RecallRoute", url: "", sha: "", length: "", citation: "" };

const short = (v?: string) => v ? `${v.slice(0, 8)}…${v.slice(-6)}` : "—";

export default function ConsolePage() {
  const [account, setAccount] = useState("");
  const [caseForm, setCaseForm] = useState(EMPTY_CASE);
  const [sourceForm, setSourceForm] = useState(EMPTY_SOURCE);
  const [activeSource, setActiveSource] = useState<"0"|"1">("0");
  const [caseData, setCaseData] = useState<CaseData|null>(null);
  const [notices, setNotices] = useState<(NoticeData|null)[]>([null, null]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("Ready. Connect the authority wallet to begin a synthetic case.");
  const [lastHash, setLastHash] = useState("");
  const [windowClose] = useState(() => Math.floor(Date.now() / 1000) + 86_400);

  const sync = useCallback(async () => {
    const result = await readContract("get_case", [caseForm.caseId]);
    const data = result.success ? unwrap<CaseData>(result.data) : null;
    setCaseData(data && data.case_id ? data : null);
    if (data?.case_id) {
      const loaded = await Promise.all(["0", "1"].map(async id => {
        const n = await readContract("get_notice", [caseForm.caseId, id]);
        return n.success ? unwrap<NoticeData>(n.data) : null;
      }));
      setNotices(loaded);
    } else setNotices([null, null]);
    setMessage(result.success ? (data?.case_id ? "Authoritative case readback synchronized." : "No case exists for this ID yet.") : (result.error || "Readback failed."));
  }, [caseForm.caseId]);

  useEffect(() => { recoverTransaction().then(r => { if (r.hash) { setLastHash(r.hash); setMessage(r.error || "Recovered finalized transaction."); } }); }, []);

  async function connect() {
    const r = await connectWallet();
    if (r.success) { setAccount(String(r.data)); setMessage("Wallet connected. Role permissions are enforced by the contract."); }
    else setMessage(r.error || "Wallet connection failed.");
  }

  async function act(label: string, fn: string, args: unknown[]) {
    setBusy(label); setMessage(`${label} transaction awaiting finality…`);
    const r = await writeContract(fn, args);
    setBusy("");
    if (r.hash) setLastHash(r.hash);
    setMessage(r.success ? `${label} finalized. Synchronizing authoritative readback…` : (r.error || `${label} failed.`));
    if (r.success) await sync();
  }

  const sourceRole = activeSource === "0" ? "OEM" : "REGULATOR";
  const stage = useMemo(() => {
    if (!caseData) return 0;
    return ({ DRAFT: 1, SEALED: 2, READY: 3, ASSESSED: 4, FINALIZED: 5, CANCELLED: 5 } as Record<string,number>)[caseData.status] ?? 0;
  }, [caseData]);
  const fields: [string,string][] = caseData ? [["Model",caseData.model_relation],["Serial",caseData.serial_relation],["Batch",caseData.batch_relation],["Date",caseData.date_relation],["Region",caseData.region_relation],["Remedy",caseData.remedy_relation],["Action",caseData.action_relation]] : [];

  return <main className="consolePage">
    <header className="consoleHeader"><Link className="brand" href="/"><Image src="/recallroute-logo.png" alt="RecallRoute" width={40} height={40}/><span>RecallRoute</span></Link><div className="network"><span/> {networkName.toUpperCase()}</div><button className="walletBtn" onClick={connect}><Wallet size={16}/>{account ? short(account) : "Connect wallet"}</button></header>
    <section className="consoleShell">
      <div className="consoleIntro"><Link href="/"><ArrowLeft size={15}/> Product</Link><div><span className="kicker">VERIFICATION WORKBENCH</span><h1>Route one battery.<br/><em>Expose every decision.</em></h1></div><button className="syncBtn" onClick={sync}><RefreshCw size={16}/> Sync case</button></div>
      <div className="noticeLine"><Radar size={20}/><div><b>{caseData ? "Readback available" : "Operator note"}</b><span>{message}</span></div>{lastHash && <a href={txUrl(lastHash)} target="_blank">Transaction <ArrowUpRight size={14}/></a>}</div>
      <div className="stageRail">{["Draft","Sources","Owner accept","Assess","Finalize"].map((name,i)=><div className={stage>i?"stage done":stage===i?"stage active":"stage"} key={name}><span>{stage>i?<Check size={14}/>:String(i+1).padStart(2,"0")}</span><b>{name}</b></div>)}</div>

      <div className="workGrid">
        <div className="workStack">
          <Panel icon={<Fingerprint/>} number="01" eyebrow="AUTHORITY ACTION" title="Seal the exact product identity">
            <div className="formGrid cols2"><Field label="Case ID" value={caseForm.caseId} onChange={v=>setCaseForm({...caseForm,caseId:v})}/><Field label="Owner wallet" value={caseForm.owner} onChange={v=>setCaseForm({...caseForm,owner:v})} placeholder="0x… distinct owner"/><Field label="Campaign" value={caseForm.campaign} onChange={v=>setCaseForm({...caseForm,campaign:v})}/><Field label="Product model" value={caseForm.model} onChange={v=>setCaseForm({...caseForm,model:v})}/><Field label="Serial number" value={caseForm.serial} onChange={v=>setCaseForm({...caseForm,serial:v})}/><Field label="Batch" value={caseForm.batch} onChange={v=>setCaseForm({...caseForm,batch:v})}/><Field label="Purchase date" value={caseForm.purchaseDate} onChange={v=>setCaseForm({...caseForm,purchaseDate:v})}/><Field label="Market region" value={caseForm.region} onChange={v=>setCaseForm({...caseForm,region:v})}/></div>
            <Action disabled={!account || !!caseData} busy={busy==="Create case"} onClick={()=>act("Create case","create_case",[caseForm.caseId,caseForm.owner,caseForm.campaign,caseForm.model,caseForm.serial,caseForm.batch,caseForm.purchaseDate,caseForm.region,0,windowClose])}>Create bounded case</Action>
          </Panel>

          <Panel icon={<Database/>} number="02" eyebrow="AUTHORITY ACTION" title="Pin OEM + regulator notices">
            <div className="sourceTabs"><button className={activeSource==="0"?"selected":""} onClick={()=>setActiveSource("0")}>01 · OEM</button><button className={activeSource==="1"?"selected":""} onClick={()=>setActiveSource("1")}>02 · Regulator</button></div>
            <div className="formGrid cols2"><Field label="Approved repository origin" value={sourceForm.origin} onChange={v=>setSourceForm({...sourceForm,origin:v})}/><Field label="Commit-pinned raw URL" value={sourceForm.url} onChange={v=>setSourceForm({...sourceForm,url:v})}/><Field label="SHA-256" value={sourceForm.sha} onChange={v=>setSourceForm({...sourceForm,sha:v})}/><Field label="Exact byte length" value={sourceForm.length} onChange={v=>setSourceForm({...sourceForm,length:v})}/><Field wide label="Unique citation" value={sourceForm.citation} onChange={v=>setSourceForm({...sourceForm,citation:v})}/></div>
            <div className="splitActions"><Action disabled={!caseData || caseData.status!=="DRAFT" || caseData.source_count!==Number(activeSource)} busy={busy===`Add ${sourceRole}`} onClick={()=>act(`Add ${sourceRole}`,"add_notice",[caseForm.caseId,activeSource,sourceRole,sourceForm.origin,sourceForm.url,sourceForm.sha,Number(sourceForm.length),sourceForm.citation])}>Add {sourceRole.toLowerCase()} receipt</Action><button className="outlineAction" disabled={!caseData || caseData.source_count!==2 || caseData.status!=="DRAFT"} onClick={()=>act("Seal dossier","seal_case",[caseForm.caseId])}>Seal dossier</button></div>
          </Panel>

          <Panel icon={<FileCheck2/>} number="03" eyebrow="OWNER ACTION" title="Accept the entire sealed dossier">
            <p className="panelText">Switch to the exact owner wallet. Acceptance covers product facts, observation window and both source policies—not just the campaign name.</p><div className="digestBox"><span>DOSSIER DIGEST</span><code>{caseData?.dossier_digest || "Awaiting authority seal"}</code></div><Action disabled={!caseData || caseData.status!=="SEALED"} busy={busy==="Accept dossier"} onClick={()=>act("Accept dossier","accept_case",[caseForm.caseId,caseData?.dossier_digest||""])}>Accept exact digest</Action>
          </Panel>

          <Panel icon={<Route/>} number="04" eyebrow="PERMISSIONLESS CHECKPOINT" title="Assess, route and finalize">
            <p className="panelText">Validators recompute both sources. The contract derives the route from the complete consequential tuple; the model cannot directly finalize state.</p><div className="splitActions"><Action disabled={!caseData || caseData.status!=="READY"} busy={busy==="Assess case"} onClick={()=>act("Assess case","assess_case",[caseForm.caseId])}>Run independent assessment</Action><button className="outlineAction" disabled={!caseData || caseData.status!=="ASSESSED"} onClick={()=>act("Finalize case","finalize_case",[caseForm.caseId])}>Finalize route</button><button className="outlineAction" disabled={!caseData || caseData.status!=="READY"} onClick={()=>act("Expire case","expire_to_manual_review",[caseForm.caseId])}>Expire to manual review</button><button className="outlineAction" disabled={!caseData || !["DRAFT","SEALED"].includes(caseData.status)} onClick={()=>act("Cancel case","cancel_draft",[caseForm.caseId])}>Cancel draft</button></div>
          </Panel>
        </div>

        <aside className="caseAside">
          <div className="asideTop"><Image src="/recallroute-logo.png" alt="" width={64} height={64}/><div><span>DIGITAL RECALL RECEIPT</span><h2>{caseData?.product_model || "NO CASE"}</h2><code>{caseData?.case_id || "ID / —"}</code></div></div>
          <div className={`outcome ${caseData?.route?.toLowerCase()||"pending"}`}><span>FINAL ROUTE</span><strong>{caseData?.route || "PENDING"}</strong><p>{caseData?.reason || "Create or synchronize a case to begin."}</p></div>
          <dl className="facts"><div><dt>Authority</dt><dd>{short(caseData?.authority)}</dd></div><div><dt>Owner</dt><dd>{short(caseData?.owner)}</dd></div><div><dt>Campaign</dt><dd>{caseData?.campaign_ref||"—"}</dd></div><div><dt>Serial</dt><dd>{caseData?.serial_number||"—"}</dd></div><div><dt>Batch</dt><dd>{caseData?.batch_id||"—"}</dd></div><div><dt>Region</dt><dd>{caseData?.market_region||"—"}</dd></div><div><dt>Action</dt><dd>{caseData?.immediate_action||"—"}</dd></div><div><dt>Remedy</dt><dd>{caseData?.remedy||"—"}</dd></div></dl>
          <div className="asideSection"><span className="asideLabel">SOURCE RECEIPTS</span>{["OEM","REGULATOR"].map((r,i)=><div className="sourceReceipt" key={r}><ShieldCheck size={17}/><div><b>{r}</b><span>{notices[i]?short(notices[i]?.source_sha256):"Not pinned"}</span></div></div>)}</div>
          <div className="asideSection"><span className="asideLabel">SEMANTIC MATRIX</span><div className="matrix">{fields.length?fields.map(([k,v])=><div key={k}><span>{k}</span><b className={v.toLowerCase()}>{v}</b></div>):<p>No assessment yet.</p>}</div></div>
          <div className="asideButtons"><a href={explorerUrl()} target="_blank">Contract <ArrowUpRight size={14}/></a><span>{contractAddress()?short(contractAddress()):"Not configured"}</span></div>
          <div className="safetyNote"><CircleAlert size={16}/><span>Synthetic demo. Affected routing never transfers funds or replaces official safety guidance.</span></div>
        </aside>
      </div>
    </section>
  </main>;
}

function Panel({icon,number,eyebrow,title,children}:{icon:React.ReactNode;number:string;eyebrow:string;title:string;children:React.ReactNode}) { return <section className="workPanel"><div className="panelMark"><span>{icon}</span><code>{number}</code></div><div className="panelBody"><span className="panelEyebrow">{eyebrow}</span><h2>{title}</h2>{children}</div></section>; }
function Field({label,value,onChange,placeholder,wide}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;wide?:boolean}) { return <label className={wide?"field wide":"field"}><span>{label}</span><input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>; }
function Action({children,onClick,disabled,busy}:{children:React.ReactNode;onClick:()=>void;disabled?:boolean;busy?:boolean}) { return <button className="primaryAction" disabled={disabled||busy} onClick={onClick}>{busy?<LoaderCircle className="spin" size={18}/>:null}{children}</button>; }
