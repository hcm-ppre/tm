import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Lock, Mail } from "lucide-react";

const LOGO = "/assets/logo.png";
const LOGIN_BG = "/assets/login-bg.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left — form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-12 max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-16">
          <img src={LOGO} alt="PT PP Presisi" className="h-12 w-auto object-contain" />
          <div className="leading-tight border-l border-border pl-3">
            <p className="font-heading font-black text-base tracking-tight text-slate-900">PT PP PRESISI Tbk</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Talent Management Portal</p>
          </div>
        </div>

        <div className="mb-10">
          <p className="label-caps mb-3">Welcome back</p>
          <h1 className="font-heading font-black text-4xl tracking-tight text-slate-900 mb-3">
            Sign in to continue
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Control talent programs, movements and workforce demographics across the organization.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5" data-testid="login-form">
          <div>
            <label className="label-caps block mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email"
                placeholder="you@pppresisi.co.id"
                className="w-full pl-10 pr-4 py-3 text-sm border border-border rounded-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="label-caps block mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 text-sm border border-border rounded-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {error && (
            <div
              data-testid="login-error"
              className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-sm px-4 py-3"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-[#0C3C66] text-white font-semibold text-sm py-3.5 rounded-sm transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      {/* Right — image */}
      <div className="hidden lg:block relative">
        <img src={LOGIN_BG} alt="PT PP Presisi" className="absolute inset-0 h-full w-full object-cover object-left" />
        <div className="absolute inset-0 bg-[#0B1120]/60" />
        <div className="absolute inset-0 flex flex-col justify-end p-16">
          <div className="border-l-4 border-accent pl-6">
            <p className="font-heading font-black text-white text-3xl leading-tight tracking-tight mb-3">
              Talent Management<br />Portal
            </p>
            <p className="text-slate-300 text-sm max-w-md leading-relaxed">
              A precision-driven platform to track demographics, promotions, mutations, training and
              workforce distribution in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
