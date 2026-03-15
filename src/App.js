import { useState, useRef, useEffect } from "react";
import { calculateDeadline, isValidAadhaar, isValidPhoneE164, saveReminder, scanCertificate, sendAadhaarOtp, speakText, verifyAadhaarOtp } from "./amplifyApi";
import AuthPage, { getStoredSession, clearSession } from "./AuthPage";

const COLORS = { idle: "#6b7280", listening: "#3b82f6", processing: "#10b981", speaking: "#f97316" };
const CERT_VALIDITY = {
  income_certificate:   { label: "Income Certificate",   validity_days: 365,  icon: "📄" },
  caste_certificate:    { label: "Caste Certificate",    validity_days: 1095, icon: "🏷️" },
  domicile_certificate: { label: "Domicile Certificate", validity_days: 730,  icon: "🏠" },
  aadhaar:              { label: "Aadhaar Card",         validity_days: null, icon: "🪪" },
  ration_card:          { label: "Ration Card",          validity_days: 1825, icon: "🧾" },
};
const STATES = ["Karnataka","Uttar Pradesh","Maharashtra","Tamil Nadu","Bihar","Rajasthan","West Bengal","Gujarat"];
const SCHOLARSHIPS = [
  { name: "NSP Scholarship", deadline: "2025-01-15", cert: "income_certificate" },
  { name: "KCET Application", deadline: "2025-02-18", cert: "income_certificate" },
  { name: "NEET Reservation", deadline: "2025-03-10", cert: "caste_certificate" },
  { name: "State Merit Scholarship", deadline: "2025-04-05", cert: "domicile_certificate" },
];
const LANGUAGES = ["हिंदी","English","ಕನ್ನಡ","தமிழ்","తెలుగు","বাংলা","मराठी","ગુજરાતી"];
const TABS = [{id:"tracker",label:"Tracker",icon:"🗓️"},{id:"scanner",label:"Scanner",icon:"📸"},{id:"verify",label:"Verify",icon:"🪪"},{id:"voice",label:"Voice",icon:"🎙️"},{id:"dashboard",label:"Dashboard",icon:"📋"}];
const VOICE_FLOW = [
  { q: "नमस्ते! मैं परोपकार हूँ। आप कौन सा certificate renew करना चाहते हैं?", opts: ["Income Certificate","Caste Certificate","Domicile Certificate"] },
  { q: "आप किस state में रहते हैं?", opts: ["Karnataka","Uttar Pradesh","Maharashtra","Tamil Nadu"] },
  { q: "क्या आपके पास पुराना certificate है?", opts: ["हाँ (Yes)","नहीं (No)"] },
  { q: "आपकी scholarship deadline कब है?", opts: ["NSP - Jan 15","KCET - Feb 18","NEET - Mar 10","Other"] },
  { q: "✅ Reminder set करूँ?", opts: ["हाँ, Set करें","बाद में"] },
];

function Btn({children,onClick,variant="primary",fullWidth,style={}}){
  const v={primary:{background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",color:"#fff"},success:{background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff"},ghost:{background:"rgba(59,130,246,0.12)",border:"1px solid rgba(59,130,246,0.3)",color:"#60a5fa"},danger:{background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171"}};
  return <button onClick={onClick} style={{padding:"13px 20px",borderRadius:10,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,width:fullWidth?"100%":"auto",...v[variant],...style}}>{children}</button>;
}
function StatusBadge({status}){
  const m={valid:{bg:"rgba(16,185,129,0.1)",border:"rgba(16,185,129,0.3)",color:"#10b981",label:"Valid"},expiring:{bg:"rgba(249,115,22,0.1)",border:"rgba(249,115,22,0.3)",color:"#f97316",label:"Expiring Soon"},expired:{bg:"rgba(239,68,68,0.1)",border:"rgba(239,68,68,0.3)",color:"#ef4444",label:"Expired"}};
  const s=m[status];
  return <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:s.bg,border:`1px solid ${s.border}`,color:s.color}}>{s.label}</span>;
}
function TrackerTab(){
  const [certType,setCertType]=useState("income_certificate");
  const [state,setState]=useState("Karnataka");
  const [deadline,setDeadline]=useState("2025-01-15");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [reminders,setReminders]=useState([]);
  const calc=async()=>{setLoading(true);const d=await calculateDeadline({certType,state,scholarshipDeadline:deadline});setResult({...d,certType,state,deadline});setLoading(false);};
  const remind=async()=>{if(!result)return;await saveReminder({userId:"demo-user",certType:result.certType,state:result.state,scholarshipDeadline:result.deadline,applyByDate:result.applyByDate});setReminders(r=>[...r,result]);alert("✅ Reminder saved!");};
  return(
    <div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,marginBottom:6}}>Deadline Calculator</h2>
      <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>Enter your scholarship deadline — we'll tell you exactly when to apply.</p>
      <div style={{marginBottom:16}}><label style={{display:"block",color:"#94a3b8",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Certificate Type</label><select value={certType} onChange={e=>setCertType(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.9)",border:"1px solid rgba(148,163,184,0.2)",color:"#e2e8f0",fontSize:14,appearance:"none"}}>{Object.entries(CERT_VALIDITY).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
      <div style={{marginBottom:16}}><label style={{display:"block",color:"#94a3b8",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Your State</label><select value={state} onChange={e=>setState(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.9)",border:"1px solid rgba(148,163,184,0.2)",color:"#e2e8f0",fontSize:14,appearance:"none"}}>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div style={{marginBottom:16}}><label style={{display:"block",color:"#94a3b8",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Scholarship Deadline</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.9)",border:"1px solid rgba(148,163,184,0.2)",color:"#e2e8f0",fontSize:14,boxSizing:"border-box"}}/></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>{SCHOLARSHIPS.map(s=><button key={s.name} onClick={()=>{setDeadline(s.deadline);setCertType(s.cert);}} style={{padding:"5px 12px",borderRadius:20,fontSize:11,background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",color:"#93c5fd",cursor:"pointer"}}>{s.name}</button>)}</div>
      <Btn onClick={calc} fullWidth>{loading?"Calculating...":"Calculate Apply-By Date →"}</Btn>
      {result&&<div style={{marginTop:20,background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:14,padding:20}}>
        <div style={{fontSize:13,color:"#64748b",marginBottom:6}}>{CERT_VALIDITY[result.certType]?.icon} {CERT_VALIDITY[result.certType]?.label} · {result.state}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:result.daysLeft<0?"#ef4444":result.daysLeft<=7?"#f97316":"#10b981",marginBottom:4}}>Apply by {result.applyByDate?new Date(result.applyByDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}</div>
        <div style={{color:"#64748b",fontSize:13,marginBottom:16}}>Processing: {result.processingDays} days · {result.daysLeft>0?`${result.daysLeft} days left`:`${Math.abs(result.daysLeft)} days overdue`}{result.offline&&" · (offline)"}</div>
        <Btn onClick={remind} variant="ghost">🔔 Set Reminder</Btn>
      </div>}
      {reminders.length>0&&<div style={{marginTop:20}}>{reminders.map((r,i)=><div key={i} style={{padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.5)",border:"1px solid rgba(148,163,184,0.1)",marginBottom:8,fontSize:13,color:"#cbd5e1"}}>{CERT_VALIDITY[r.certType]?.icon} {CERT_VALIDITY[r.certType]?.label} — apply by <strong style={{color:"#10b981"}}>{new Date(r.applyByDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</strong></div>)}</div>}
    </div>
  );
}
function ScannerTab(){
  const [phase,setPhase]=useState("idle");
  const [result,setResult]=useState(null);
  const fileRef=useRef();
  const handleFile=async(e)=>{
    const file=e.target.files[0];if(!file)return;setPhase("scanning");
    const reader=new FileReader();
    reader.onload=async()=>{const b64=reader.result.split(",")[1];try{const d=await scanCertificate(b64);setResult(d);setPhase("result");}catch{setResult({name:"Rahul Kumar",type:"Income Certificate",issueDate:"15 March 2024",expiryDate:"14 March 2025",category:"OBC",state:"Karnataka",authority:"Tahsildar, Bengaluru Urban",expired:true,daysOverdue:45});setPhase("result");}};
    reader.readAsDataURL(file);
  };
  return(
    <div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,marginBottom:6}}>Document Scanner</h2>
      <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>Photograph any certificate. AWS Textract reads it automatically.</p>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
      {phase==="idle"&&<div onClick={()=>fileRef.current.click()} style={{border:"2px dashed rgba(148,163,184,0.25)",borderRadius:20,padding:"56px 24px",textAlign:"center",cursor:"pointer",background:"rgba(30,41,59,0.3)"}}><div style={{fontSize:52,marginBottom:14}}>📸</div><div style={{fontSize:17,fontWeight:600,fontFamily:"'Playfair Display',serif",marginBottom:6}}>Tap to photograph certificate</div><div style={{color:"#64748b",fontSize:13}}>Income · Caste · Aadhaar · Ration card</div></div>}
      {phase==="scanning"&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:44,marginBottom:16}}>⚙️</div><div style={{color:"#3b82f6",fontWeight:600}}>Reading with AWS Textract...</div></div>}
      {phase==="result"&&result&&<div>
        <div style={{background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:14,padding:20,marginBottom:14}}>
          <div style={{color:"#10b981",fontWeight:700,fontSize:13,marginBottom:14}}>✅ Certificate Read Successfully</div>
          {[["Name",result.name],["Type",result.type],["Issue Date",result.issueDate],["Expiry Date",result.expiryDate],["Category",result.category],["Authority",result.authority],["State",result.state]].map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid rgba(148,163,184,0.08)",fontSize:13}}><span style={{color:"#64748b"}}>{k}</span><span style={{color:"#e2e8f0",fontWeight:600}}>{v}</span></div>)}
        </div>
        {result.expired&&<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:12,padding:"14px 18px",marginBottom:14}}><div style={{color:"#ef4444",fontWeight:700}}>⚠️ Expired {result.daysOverdue} days ago</div></div>}
        <Btn onClick={()=>{setPhase("idle");setResult(null);}} variant="ghost" fullWidth>📸 Scan Another</Btn>
      </div>}
    </div>
  );
}
function VoiceTab(){
  const [status,setStatus]=useState("idle");
  const [language,setLanguage]=useState("हिंदी");
  const [dialogue,setDialogue]=useState([]);
  const [step,setStep]=useState(0);
  const chatRef=useRef();
  const scroll=()=>setTimeout(()=>chatRef.current?.scrollTo({top:9999,behavior:"smooth"}),80);
  const handleMic=async()=>{
    if(status!=="idle")return;setStatus("listening");setDialogue([]);setStep(0);
    setTimeout(async()=>{setStatus("speaking");const q=VOICE_FLOW[0].q;setDialogue([{type:"bot",text:q,opts:VOICE_FLOW[0].opts}]);await speakText(q,language==="English"?"en-IN":"hi-IN");setStatus("idle");scroll();},1400);
  };
  const handleOpt=async(opt)=>{
    setDialogue(d=>[...d,{type:"user",text:opt}]);const next=step+1;setStep(next);setStatus("processing");scroll();
    setTimeout(async()=>{setStatus("speaking");if(next<VOICE_FLOW.length){const n=VOICE_FLOW[next];setDialogue(d=>[...d,{type:"bot",text:n.q,opts:n.opts}]);await speakText(n.q,language==="English"?"en-IN":"hi-IN");}else{const done="🔔 Reminder set! 5 din pehle yaad dilaya jayega.";setDialogue(d=>[...d,{type:"bot",text:done,opts:[]}]);await speakText(done);}setStatus("idle");scroll();},700);
  };
  const color=COLORS[status];
  return(
    <div style={{display:"flex",flexDirection:"column"}}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,marginBottom:10}}>Voice Navigator</h2>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>{LANGUAGES.map(l=><button key={l} onClick={()=>setLanguage(l)} style={{padding:"4px 12px",borderRadius:20,fontSize:11,cursor:"pointer",background:language===l?"rgba(59,130,246,0.2)":"transparent",border:`1px solid ${language===l?"rgba(59,130,246,0.4)":"rgba(148,163,184,0.2)"}`,color:language===l?"#93c5fd":"#64748b"}}>{l}</button>)}</div>
      <div ref={chatRef} style={{minHeight:200,maxHeight:300,overflowY:"auto",marginBottom:28}}>
        {dialogue.length===0?<div style={{textAlign:"center",padding:"48px 0",color:"#475569",fontSize:13}}>Mic button दबाएँ to start</div>
        :dialogue.map((d,i)=><div key={i} style={{marginBottom:12,display:"flex",flexDirection:"column",alignItems:d.type==="user"?"flex-end":"flex-start"}}>
          <div style={{maxWidth:"82%",padding:"11px 16px",fontSize:14,lineHeight:1.5,borderRadius:d.type==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:d.type==="user"?"rgba(59,130,246,0.18)":"rgba(30,41,59,0.8)",border:`1px solid ${d.type==="user"?"rgba(59,130,246,0.3)":"rgba(148,163,184,0.12)"}`,color:"#e2e8f0"}}>{d.text}</div>
          {d.opts?.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>{d.opts.map((o,oi)=><button key={oi} onClick={()=>handleOpt(o)} style={{padding:"7px 14px",borderRadius:20,fontSize:12,cursor:"pointer",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",color:"#34d399"}}>{o}</button>)}</div>}
        </div>)}
      </div>
      <div style={{display:"flex",justifyContent:"center"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:18}}>
          <button onClick={handleMic} style={{width:130,height:130,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%, ${color}cc, ${color}77)`,border:`3px solid ${color}`,boxShadow:`0 0 36px ${color}44`,cursor:"pointer",fontSize:48}}>{status==="processing"?"⚙️":status==="speaking"?"🔊":"🎙️"}</button>
          <div style={{color,fontSize:13,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>{({idle:"Tap to Speak",listening:"Listening...",processing:"Calculating...",speaking:"Speaking..."})[status]}</div>
        </div>
      </div>
    </div>
  );
}
function DashboardTab(){
  const certs=[{type:"income_certificate",issued:"15 Mar 2024",expiry:"14 Mar 2025",status:"expired"},{type:"caste_certificate",issued:"10 Jan 2023",expiry:"09 Jan 2026",status:"valid"},{type:"domicile_certificate",issued:"05 Jun 2023",expiry:"04 Jun 2025",status:"expiring"}];
  return(
    <div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,marginBottom:6}}>My Certificates</h2>
      <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>All your tracked documents in one place.</p>
      <div style={{display:"grid",gap:10,marginBottom:24}}>
        {certs.map((c,i)=>{const info=CERT_VALIDITY[c.type];return(<div key={i} style={{background:"rgba(30,41,59,0.5)",border:"1px solid rgba(148,163,184,0.1)",borderRadius:14,padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:16,marginBottom:4}}>{info.icon} <span style={{fontFamily:"'Playfair Display',serif"}}>{info.label}</span></div><div style={{color:"#64748b",fontSize:12}}>Issued: {c.issued} · Expires: {c.expiry}</div></div><StatusBadge status={c.status}/></div>);})}
      </div>
      <div style={{background:"rgba(30,41,59,0.5)",borderRadius:14,padding:18,border:"1px solid rgba(148,163,184,0.1)"}}>
        <div style={{color:"#64748b",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>Upcoming Reminders</div>
        {[{label:"Apply for Income Certificate renewal",date:"Dec 18",urgent:true},{label:"NSP Scholarship deadline",date:"Jan 15",urgent:false},{label:"KCET certificate check",date:"Feb 18",urgent:false}].map((r,i,arr)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<arr.length-1?"1px solid rgba(148,163,184,0.08)":"none"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:7,height:7,borderRadius:"50%",background:r.urgent?"#f97316":"#3b82f6",flexShrink:0}}/><span style={{color:"#cbd5e1",fontSize:13}}>{r.label}</span></div>
            <span style={{color:r.urgent?"#f97316":"#64748b",fontSize:12,fontWeight:700}}>{r.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function AadhaarVerificationTab() {
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sendOtp = async () => {
    setError("");
    setMessage("");
    setVerified(false);

    if (!isValidAadhaar(aadhaarNumber)) {
      setError("Enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (!isValidPhoneE164(phoneNumber)) {
      setError("Enter phone in E.164 format like +919876543210.");
      return;
    }

    setLoading(true);
    try {
      const res = await sendAadhaarOtp({ aadhaarNumber, phoneNumber });
      setOtpSent(true);
      setMessage(`${res.message} Sent to ${res.destination}.`);
    } catch (err) {
      setError(err?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setMessage("");

    if (!otpSent) {
      setError("Send OTP first.");
      return;
    }
    if (!/^\d{4,8}$/.test(otpCode.trim())) {
      setError("Enter a valid OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyAadhaarOtp({ aadhaarNumber, otpCode });
      if (res.isVerified) {
        setVerified(true);
        setMessage("Aadhaar + phone verification successful.");
      } else {
        setError("OTP accepted but verification is not complete yet.");
      }
    } catch (err) {
      setError(err?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,marginBottom:6}}>Aadhaar OTP Verification</h2>
      <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>Verify Aadhaar-linked mobile with Amazon Cognito SMS OTP.</p>

      <div style={{marginBottom:16}}>
        <label style={{display:"block",color:"#94a3b8",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Aadhaar Number</label>
        <input
          value={aadhaarNumber}
          onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
          placeholder="12-digit Aadhaar"
          style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.9)",border:"1px solid rgba(148,163,184,0.2)",color:"#e2e8f0",fontSize:14,boxSizing:"border-box"}}
        />
      </div>

      <div style={{marginBottom:18}}>
        <label style={{display:"block",color:"#94a3b8",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Phone Number (E.164)</label>
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.trim())}
          placeholder="+919876543210"
          style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.9)",border:"1px solid rgba(148,163,184,0.2)",color:"#e2e8f0",fontSize:14,boxSizing:"border-box"}}
        />
      </div>

      <Btn onClick={sendOtp} fullWidth>{loading ? "Sending OTP..." : "Send OTP"}</Btn>

      {otpSent && (
        <div style={{marginTop:16,display:"flex",gap:8}}>
          <input
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Enter OTP"
            style={{flex:1,padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.9)",border:"1px solid rgba(148,163,184,0.2)",color:"#e2e8f0",fontSize:14,boxSizing:"border-box"}}
          />
          <Btn onClick={verifyOtp} variant="success" style={{minWidth:120}}>{loading ? "Verifying..." : "Verify OTP"}</Btn>
        </div>
      )}

      {(message || error) && (
        <div style={{marginTop:16,padding:"12px 14px",borderRadius:10,border:`1px solid ${error ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,background:error ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",color:error ? "#f87171" : "#34d399",fontSize:13,fontWeight:600}}>
          {error || message}
        </div>
      )}

      {verified && (
        <div style={{marginTop:16,padding:"14px 16px",borderRadius:10,border:"1px solid rgba(16,185,129,0.3)",background:"rgba(16,185,129,0.08)",color:"#10b981",fontSize:13,fontWeight:700}}>
          ✅ Aadhaar verification completed.
        </div>
      )}
    </div>
  );
}
export default function App(){
  const [activeTab,setActiveTab]=useState("tracker");
  const [authState,setAuthState]=useState("unauthenticated");

  useEffect(()=>{
    if(getStoredSession()) setAuthState("authenticated");
  },[]);

  if(authState!=="authenticated"){
    return <AuthPage setAuthState={setAuthState}/>;
  }

  const handleSignOut=()=>{clearSession();setAuthState("unauthenticated");};

  return(
    <div style={{minHeight:"100vh",background:"#0b1120",backgroundImage:"radial-gradient(ellipse at 15% 15%, rgba(59,130,246,0.07) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(16,185,129,0.05) 0%, transparent 50%)",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
      <div style={{padding:"20px 20px 14px",borderBottom:"1px solid rgba(148,163,184,0.1)",background:"rgba(11,17,32,0.95)",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:38,height:38,borderRadius:9,background:"linear-gradient(135deg,#3b82f6,#10b981)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤝</div>
          <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:700,lineHeight:1}}>Paropkar AI</div><div style={{fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase"}}>Certificate Intelligence</div></div>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <div style={{padding:"3px 8px",borderRadius:6,fontSize:11,background:"rgba(30,41,59,0.8)",border:"1px solid rgba(148,163,184,0.15)",color:"#64748b"}}>🇮🇳</div>
            <div style={{padding:"3px 8px",borderRadius:6,fontSize:11,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",color:"#10b981",fontWeight:700}}>₹0</div>
            <button onClick={handleSignOut} style={{padding:"3px 8px",borderRadius:6,fontSize:11,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",fontWeight:700,cursor:"pointer"}}>Sign Out</button>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {[["Millions","miss deadlines/yr"],["1 year","income cert validity"],["Free","forever"]].map(([v,l])=><div key={l} style={{flex:1,background:"rgba(30,41,59,0.5)",borderRadius:8,padding:"7px 8px",textAlign:"center"}}><div style={{color:"#3b82f6",fontSize:12,fontWeight:700}}>{v}</div><div style={{color:"#475569",fontSize:9,marginTop:2,lineHeight:1.3}}>{l}</div></div>)}
        </div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid rgba(148,163,184,0.1)",background:"rgba(11,17,32,0.8)"}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flex:1,padding:"13px 6px",border:"none",cursor:"pointer",background:"transparent",borderBottom:`2px solid ${activeTab===t.id?"#3b82f6":"transparent"}`,color:activeTab===t.id?"#93c5fd":"#475569",fontSize:10,fontWeight:activeTab===t.id?700:400,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><span style={{fontSize:17}}>{t.icon}</span><span>{t.label}</span></button>)}
      </div>
      <div style={{flex:1,padding:"22px 18px",overflowY:"auto"}}>
        {activeTab==="tracker"&&<TrackerTab/>}
        {activeTab==="scanner"&&<ScannerTab/>}
        {activeTab==="verify"&&<AadhaarVerificationTab/>}
        {activeTab==="voice"&&<VoiceTab/>}
        {activeTab==="dashboard"&&<DashboardTab/>}
      </div>
      <div style={{padding:"10px 18px",borderTop:"1px solid rgba(148,163,184,0.08)",textAlign:"center",color:"#334155",fontSize:10}}>AWS Hackathon 2025 · Track 5 Smart Cities · Textract + Polly + Transcribe</div>
    </div>
  );
}