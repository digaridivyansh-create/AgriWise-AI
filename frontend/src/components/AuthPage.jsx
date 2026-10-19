import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Leaf, LoaderCircle, ShieldCheck } from "lucide-react";
import api from "../api/client";

export default function AuthPage({ onAuthenticated, onBack }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    if (mode === "signup" && !email.trim()) {
      setError("Enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/auth/login/" : "/auth/signup/";
      const payload = {
        username: username.trim(),
        password,
        ...(mode === "signup" ? { email: email.trim() } : {}),
      };

      const response = await api.post(endpoint, payload);
      const data = response.data;

      if (!data.access || !data.refresh || !data.user) {
        throw new Error("Authentication response was incomplete.");
      }

      localStorage.setItem("agriwise_access_token", data.access);
      localStorage.setItem("agriwise_refresh_token", data.refresh);
      localStorage.setItem("agriwise_user", JSON.stringify(data.user));

      onAuthenticated(data.user);
    } catch (requestError) {
      const body = requestError.response?.data;
      const message = body?.details?.join(" ") || body?.error || body?.detail;

      setError(
        message ||
        (requestError.response
          ? `Request failed (${requestError.response.status}). Please try again.`
          : "Could not connect to the server. Check that Django is running.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f8f1] px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#dceecf]/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#e4edda] blur-3xl" />

      <button
        type="button"
        onClick={onBack}
        className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-[#dce7d6] bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#426148] transition hover:bg-white sm:left-8 sm:top-8"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#e0e9da] bg-white shadow-[0_30px_100px_-45px_rgba(31,74,42,0.3)] md:grid-cols-2"
      >
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#214e35] p-10 text-white md:flex lg:p-12">
          <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full border-[45px] border-white/[0.06]" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full border-[50px] border-white/[0.06]" />

          <a href="#home" className="relative flex items-center gap-3 text-lg font-extrabold tracking-tight">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Leaf size={23} />
            </span>
            AgriWise AI
          </a>

          <div className="relative my-12">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#c2dfab]">
              Better decisions start here
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.15] tracking-[-0.045em] lg:text-5xl">
              Grow with data.
              <br />
              Plan with confidence.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
              Your agricultural workspace for crop recommendations, plant health insights, market intelligence, and farm history.
            </p>
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <ShieldCheck className="shrink-0 text-[#c2dfab]" size={23} />
              <p className="text-xs leading-5 text-white/75">
                Sign in to access your workspace and personal farm records.
              </p>
            </div>
          </div>

          <p className="relative text-xs text-white/50">Agricultural decision support, informed by data.</p>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3e3] text-[#356c3e]">
              <Leaf size={23} />
            </span>
            <span className="text-lg font-extrabold text-[#24472f]">AgriWise AI</span>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6d9560]">
            Your farming workspace
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#193d2b]">
            {mode === "login" ? "Welcome back." : "Create your account."}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#819080]">
            {mode === "login"
              ? "Log in to continue to your AgriWise AI dashboard."
              : "Sign up to unlock your agricultural tools and farm workspace."}
          </p>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-[#f1f5ed] p-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-[#24472f] shadow-sm" : "text-[#819080]"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "signup" ? "bg-white text-[#24472f] shadow-sm" : "text-[#819080]"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="auth-username" className="mb-2 block text-sm font-semibold text-[#385640]">
                Username
              </label>
              <input
                id="auth-username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={150}
                required
                className="w-full rounded-xl border border-[#dfe8da] bg-[#fbfcf9] px-4 py-3.5 text-sm outline-none transition focus:border-[#79a86b] focus:ring-4 focus:ring-[#79a86b]/10"
                placeholder="Enter your username"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="auth-email" className="mb-2 block text-sm font-semibold text-[#385640]">
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                  className="w-full rounded-xl border border-[#dfe8da] bg-[#fbfcf9] px-4 py-3.5 text-sm outline-none transition focus:border-[#79a86b] focus:ring-4 focus:ring-[#79a86b]/10"
                  placeholder="you@example.com"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-password" className="mb-2 block text-sm font-semibold text-[#385640]">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-[#dfe8da] bg-[#fbfcf9] px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-[#79a86b] focus:ring-4 focus:ring-[#79a86b]/10"
                  placeholder={mode === "login" ? "Enter your password" : "Create a strong password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#819080] hover:bg-[#eef4e9]"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#214e35] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#173d29] disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? <LoaderCircle size={17} className="animate-spin" /> : null}
              {loading ? "Please wait..." : mode === "login" ? "Log in to AgriWise" : "Create account"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-[#8b9888]">
            Your account is managed by the AgriWise AI backend. Never share your password with anyone.
          </p>
        </section>
      </motion.div>
    </main>
  );
}
