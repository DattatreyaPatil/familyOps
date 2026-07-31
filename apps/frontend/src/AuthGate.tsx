import type { Session } from "@supabase/supabase-js";
import { LockKeyhole, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { setAccessToken } from "./api";
import { isSupabaseAuthEnabled, supabase } from "./supabaseClient";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setAccessToken(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
      setSession(data.session);
      setInitializing(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAccessToken(nextSession?.access_token ?? null);
      setSession(nextSession);
      setInitializing(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseAuthEnabled || !supabase) {
    return <>{children}</>;
  }

  if (initializing) {
    return (
      <main className="auth-canvas">
        <section className="auth-card">
          <div className="auth-mark">
            <LockKeyhole size={26} />
          </div>
          <span>FamOps private workspace</span>
          <h1>Preparing your family hub</h1>
        </section>
      </main>
    );
  }

  async function submit() {
    if (!supabase) {
      return;
    }
    setMessage("");
    const credentials = { email, password };
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(mode === "signup" ? "Account created. Check email confirmation if enabled." : "");
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  if (session) {
    return (
      <>
        <div className="session-bar">
          <span>{session.user.email}</span>
          <button onClick={signOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="auth-canvas">
      <section className="auth-card">
        <div className="auth-mark">
          <LockKeyhole size={26} />
        </div>
        <span>FamOps private workspace</span>
        <h1>{mode === "signin" ? "Sign in to your family hub" : "Create your family account"}</h1>
        <div className="form-grid">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
          <button onClick={submit}>{mode === "signin" ? "Sign in" : "Create account"}</button>
        </div>
        {message && <p className="auth-message">{message}</p>}
        <button className="auth-switch" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
