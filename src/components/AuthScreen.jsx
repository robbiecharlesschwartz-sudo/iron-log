import { useState } from "react";
import { LogIn, Shield } from "lucide-react";
import { Logo } from "./atoms";
import { C } from "../lib/constants";

export function AuthScreen({ auth, onGuest }) {
  const [mode, setMode] = useState("options"); // options | email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCreate, setIsCreate] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const inp = { backgroundColor: C.surface, color: C.ink, borderRadius: 12, padding: "10px 14px", fontSize: 15, outline: "none", width: "100%", border: `1px solid ${C.border}` };

  async function handleGoogle() {
    setLoading(true); setError(null);
    try { await auth.signInGoogle(); } catch (e) { setError(e.message); setLoading(false); }
  }
  async function handleEmail() {
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true); setError(null);
    try {
      if (isCreate) await auth.createAccount(email, password);
      else await auth.signInEmail(email, password);
    } catch (e) {
      const msg = e.code === "auth/invalid-credential" ? "Incorrect email or password." : e.code === "auth/email-already-in-use" ? "Email already in use." : e.message;
      setError(msg); setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: C.bg }}>
      <Logo size={56} />
      <div className="text-[28px] font-bold tracking-tight mt-3 mb-1" style={{ color: C.ink }}>Iron Log</div>
      <div className="text-[13px] mb-8 text-center" style={{ color: C.ink3 }}>Your personal strength OS</div>

      {mode === "options" ? (
        <div className="w-full max-w-xs flex flex-col gap-3">
          <button onClick={handleGoogle} disabled={loading} className="w-full rounded-2xl py-3.5 text-[14px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.ink, color: "#fff" }}>
            <Shield size={16} /> Continue with Google
          </button>
          <button onClick={() => setMode("email")} className="w-full rounded-2xl py-3.5 text-[14px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.surface, color: C.ink, border: `1px solid ${C.border}` }}>
            <LogIn size={16} /> Sign in with Email
          </button>
          <div className="flex items-center gap-2 my-1">
            <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
            <span className="text-[11px]" style={{ color: C.ink4 }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
          </div>
          <button onClick={onGuest} className="w-full text-center text-[13px] py-2" style={{ color: C.ink3 }}>Continue without account</button>
          {error && <div className="text-[12px] text-center mt-1" style={{ color: C.bad }}>{error}</div>}
        </div>
      ) : (
        <div className="w-full max-w-xs flex flex-col gap-3">
          <div className="text-[16px] font-bold mb-1" style={{ color: C.ink }}>{isCreate ? "Create account" : "Welcome back"}</div>
          <input style={inp} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          <input style={inp} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEmail()} />
          {error && <div className="text-[12px]" style={{ color: C.bad }}>{error}</div>}
          <button onClick={handleEmail} disabled={loading} className="w-full rounded-2xl py-3.5 text-[14px] font-semibold" style={{ backgroundColor: C.ink, color: "#fff" }}>
            {loading ? "…" : isCreate ? "Create account" : "Sign in"}
          </button>
          <button onClick={() => setIsCreate(v => !v)} className="text-[12px] text-center" style={{ color: C.ink3 }}>
            {isCreate ? "Already have an account? Sign in" : "New? Create an account"}
          </button>
          <button onClick={() => setMode("options")} className="text-[12px] text-center" style={{ color: C.ink4 }}>← Back</button>
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */
/* ONBOARDING SCREEN                                                       */
/* ====================================================================== */


export function AuthInline({ auth }) {
  const [mode, setMode] = useState("options"); // options | email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCreate, setIsCreate] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const inp = { backgroundColor: C.surface, color: C.ink, borderRadius: 10, padding: "9px 12px", fontSize: 15, outline: "none", width: "100%", border: `1px solid ${C.border}` };

  async function handleGoogle() {
    setLoading(true); setError(null);
    try { await auth.signInGoogle(); } catch (e) { setError("Google sign-in failed. Make sure your Netlify domain is added to Firebase → Authentication → Authorized domains."); setLoading(false); }
  }
  async function handleEmail() {
    if (!email || !password) { setError("Enter email and password."); return; }
    setLoading(true); setError(null);
    try {
      if (isCreate) await auth.createAccount(email, password);
      else await auth.signInEmail(email, password);
    } catch (e) {
      const msg = e.code === "auth/invalid-credential" ? "Incorrect email or password." : e.code === "auth/email-already-in-use" ? "Email already in use." : e.code === "auth/weak-password" ? "Password must be 6+ characters." : e.message;
      setError(msg); setLoading(false);
    }
  }

  if (mode === "email") return (
    <div className="p-4 flex flex-col gap-2.5">
      <div className="text-[13px] font-semibold mb-1" style={{ color: C.ink }}>{isCreate ? "Create account" : "Sign in"}</div>
      <input style={inp} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
      <input style={inp} placeholder="Password (6+ chars)" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEmail()} />
      {error && <div className="text-[11.5px] leading-snug" style={{ color: C.bad }}>{error}</div>}
      <button onClick={handleEmail} disabled={loading} className="w-full rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: C.ink, color: "#fff" }}>
        {loading ? "…" : isCreate ? "Create account" : "Sign in"}
      </button>
      <div className="flex justify-between">
        <button onClick={() => setIsCreate(v => !v)} className="text-[11.5px]" style={{ color: C.ink3 }}>{isCreate ? "Already have an account?" : "Need an account?"}</button>
        <button onClick={() => { setMode("options"); setError(null); }} className="text-[11.5px]" style={{ color: C.ink4 }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="p-4 flex flex-col gap-2.5">
      <button onClick={handleGoogle} disabled={loading} className="w-full rounded-xl py-2.5 text-[13px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.ink, color: "#fff" }}>
        <Shield size={14} /> {loading ? "…" : "Continue with Google"}
      </button>
      <button onClick={() => { setIsCreate(false); setMode("email"); }} className="w-full rounded-xl py-2.5 text-[13px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.surface, color: C.ink, border: `1px solid ${C.border}` }}>
        <LogIn size={14} /> Sign in with Email
      </button>
      <button onClick={() => { setIsCreate(true); setMode("email"); }} className="w-full rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: C.accentSoft, color: C.accent }}>
        Create free account
      </button>
      {error && <div className="text-[11.5px]" style={{ color: C.bad }}>{error}</div>}
    </div>
  );
}

