import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (mounted) setUser(data.user ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => setUser(session?.user ?? null));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const fn = mode === 'register' ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const { error } = mode === 'register'
      ? await fn({ email, password })
      : await fn({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
  }

  if (!user) {
    return (
      <div className="max-w-sm mx-auto p-6 border rounded">
        <h1 className="text-lg font-semibold mb-2">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="w-full border p-2 rounded" placeholder="you@example.com" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button disabled={busy} className="w-full border p-2 rounded bg-black text-white">
            {busy ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Sign up')}
          </button>
        </form>
        {msg && <p className="text-sm text-red-600 mt-2">{msg}</p>}
        <button className="text-sm mt-3 underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? "No account? Register" : "Have an account? Sign in"}
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
