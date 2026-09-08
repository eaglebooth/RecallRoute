import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, GitCompareArrows, LockKeyhole, ScanSearch, ShieldAlert } from "lucide-react";

const steps = [
  { n: "01", title: "Seal the product", text: "The authority binds BAT-XR48 identity, owner, window and both source policies into one digest." },
  { n: "02", title: "Accept the dossier", text: "The owner approves the exact facts and sources before any validator can assess them." },
  { n: "03", title: "Compare independently", text: "Validators fetch byte-pinned OEM and regulator notices and test every scope dimension." },
  { n: "04", title: "Route deterministically", text: "The contract turns the bounded tuple into affected, not affected or manual review." },
];

export default function Home() {
  return <main>
    <nav className="nav shell"><Link className="brand" href="/"><Image src="/recallroute-logo.png" alt="RecallRoute" width={42} height={42}/><span>RecallRoute</span></Link><div className="navlinks"><a href="#how">How it works</a><a href="#boundary">Safety boundary</a><Link className="button small" href="/console">Open console <ArrowRight size={16}/></Link></div></nav>
    <section className="hero shell">
      <div className="heroCopy"><div className="eyebrow"><span className="liveDot"/> GenLayer / two-source recall routing</div><h1>Know the route.<br/><em>Keep the proof.</em></h1><p className="lede">RecallRoute checks one sealed BAT-XR48 identity against exact OEM and regulator notices—then records a conservative, auditable route onchain.</p><div className="heroActions"><Link className="button" href="/console">Verify a demo battery <ArrowRight size={18}/></Link><a className="textLink" href="#how">See the verification path</a></div><div className="disclaimer"><ShieldAlert size={18}/><span>Synthetic demo only. It does not replace manufacturer or regulator safety instructions.</span></div></div>
      <div className="orbitCard"><div className="orbit orbitOne"/><div className="orbit orbitTwo"/><Image className="heroLogo" src="/recallroute-logo.png" alt="BAT-XR48 battery recall mark" width={430} height={430} priority/><div className="routeTag tagTop"><span>OEM</span> digest verified</div><div className="routeTag tagBottom"><span>REGULATOR</span> independently matched</div></div>
    </section>
    <section className="proofBar"><div className="shell proofGrid"><div><b>2</b><span>pinned notices</span></div><div><b>5</b><span>scope relations</span></div><div><b>3</b><span>safe routes</span></div><div><b>0</b><span>automatic payouts</span></div></div></section>
    <section id="how" className="section shell"><div className="sectionHead"><span className="kicker">HOW IT WORKS</span><h2>A recall check with a visible chain of custody.</h2><p>Each checkpoint closes a common ambiguity before a consequential state can be written.</p></div><div className="steps">{steps.map((step, i)=><article className="step" key={step.n}><span className="stepNo">{step.n}</span><div className="stepIcon">{i===0?<LockKeyhole/>:i===1?<CheckCircle2/>:i===2?<ScanSearch/>:<GitCompareArrows/>}</div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
    <section id="boundary" className="boundary"><div className="shell boundaryGrid"><div><span className="kicker pale">DESIGNED TO FAIL CLOSED</span><h2>Uncertainty is a route,<br/>not a hidden guess.</h2></div><div className="boundaryList"><p><b>AFFECTED</b> only when every scope relation matches, both sources agree, coverage is sufficient and the remedy is known.</p><p><b>NOT_AFFECTED</b> only when an explicit mismatch exists without missing facts or contradiction.</p><p><b>MANUAL_REVIEW</b> for silence, partial coverage, source disagreement, malformed output or an expired window.</p></div></div></section>
    <footer className="shell footer"><div className="brand"><Image src="/recallroute-logo.png" alt="" width={34} height={34}/><span>RecallRoute</span></div><p>Proof-oriented product recall routing on GenLayer.</p><Link href="/console">Launch console <ArrowRight size={14}/></Link></footer>
  </main>;
}
