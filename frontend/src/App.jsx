import { useEffect, useState } from "react";
import BackendStatus from "./api/BackendStatus.jsx";
import CropRecommendation from "./components/CropRecommendation.jsx";
import CropAdvisory from "./components/CropAdvisory.jsx";
import PlantHealth from "./components/PlantHealth.jsx";
import MarketInsights from "./components/MarketInsights.jsx";
import AuthPage from "./components/AuthPage.jsx";
import DashboardLayout from "./components/dashboard/DashboardLayout.jsx";
import DashboardHome from "./components/dashboard/DashboardHome.jsx";
import MyFarms from "./components/dashboard/MyFarms.jsx";
import RecommendationHistory from "./components/dashboard/RecommendationHistory.jsx";
import { motion } from "framer-motion";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3,
  CloudSun, Droplets, Leaf, Menu, ShieldCheck, Sprout,
  Sun, TrendingUp, Waves, X, Zap
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";

const trend = [
  { month: "May", value: 38 },
  { month: "Jun", value: 46 },
  { month: "Jul", value: 43 },
  { month: "Aug", value: 58 },
  { month: "Sep", value: 53 },
  { month: "Oct", value: 72 },
];

const features = [
  {
    icon: Sprout,
    number: "01",
    title: "Intelligent crop selection",
    text: "Find crops suited to your soil nutrients, pH, temperature, humidity and rainfall.",
    tag: "ML-powered",
  },
  {
    icon: CloudSun,
    number: "02",
    title: "Weather-aware decisions",
    text: "Turn changing weather conditions into practical guidance for your next farming decision.",
    tag: "Climate insights",
  },
  {
    icon: Waves,
    number: "03",
    title: "Plant health intelligence",
    text: "Explore plant identification and disease-screening tools designed to help assess crop health.",
    tag: "Image analysis",
  },
  {
    icon: BarChart3,
    number: "04",
    title: "Market & profitability insights",
    text: "Explore market-price information and regional trends to make more informed crop choices.",
    tag: "Market analytics",
  },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
};

function Button({ children, href = "#features", secondary = false, onClick }) {
  return (
    <motion.a
      href={onClick ? undefined : href}
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition ${
        secondary
          ? "border border-[#dbe6d8] bg-white/75 text-[#214e35] hover:border-[#8cb49a]"
          : "bg-[#214e35] text-white shadow-lg shadow-green-950/10 hover:bg-[#163c28]"
      }`}
    >
      {children}
    </motion.a>
  );
}

function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotateX: 4 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.2 }}
      whileHover={{ y: -5 }}
      className="relative mx-auto w-full max-w-[590px]"
    >
      <div className="absolute -inset-5 rounded-[2.5rem] bg-[#b4d8a7]/25 blur-3xl" />
      <div className="relative overflow-hidden rounded-[1.8rem] border border-white bg-white/90 p-4 shadow-[0_30px_100px_-35px_rgba(29,79,48,0.28)] sm:p-6">
        <div className="flex items-center justify-between border-b border-[#edf1e9] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8f3df] text-[#347347]">
              <Sprout size={21} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#193d2b]">Farm intelligence</p>
              <p className="text-xs text-[#839286]">Your growing season</p>
            </div>
          </div>
          <span className="rounded-full border border-[#d8ead2] bg-[#f0f8eb] px-3 py-1.5 text-[10px] font-semibold text-[#367548]">
            LIVE PREVIEW
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 py-5">
          <div className="rounded-2xl bg-[#f4f8f0] p-4">
            <div className="flex items-center justify-between text-[#68806c]">
              <span className="text-xs">Soil moisture</span>
              <Droplets size={16} />
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-semibold tracking-tight text-[#214e35]">68%</span>
              <span className="mb-1 text-[10px] text-[#6b9970]">Illustrative</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dfead8]">
              <motion.div initial={{ width: 0 }} animate={{ width: "68%" }} transition={{ duration: 1.1, delay: 0.6 }} className="h-full rounded-full bg-[#69a86e]" />
            </div>
          </div>
          <div className="rounded-2xl bg-[#fbf5e9] p-4">
            <div className="flex items-center justify-between text-[#897951]">
              <span className="text-xs">Weather outlook</span>
              <Sun size={16} />
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-semibold tracking-tight text-[#604b25]">28°</span>
              <span className="mb-1 text-[10px] text-[#a48b55]">Example</span>
            </div>
            <p className="mt-3 text-xs text-[#8a7954]">Sample conditions</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#edf1e9] p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#21432e]">Seasonal growth index</p>
              <p className="mt-1 text-xs text-[#8a988b]">Illustrative trend · not live farm data</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-[#edf6e8] px-2.5 py-1 text-xs font-semibold text-[#4c8a54]">
              <TrendingUp size={13} /> Trend
            </span>
          </div>
          <div className="h-[175px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 5, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#79b77a" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#79b77a" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf1e9" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8a988b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8a988b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e4ecdf", fontSize: 12 }} />
                <Area type="monotone" dataKey="value" name="Growth index" stroke="#4b8b57" strokeWidth={2.5} fill="url(#growthFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#214e35] p-4 text-white">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Zap size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">A clearer way to plan</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/65">Bring crop, soil, plant and market insights together.</p>
          </div>
          <ArrowUpRight size={18} className="shrink-0 text-[#bce6a7]" />
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authView, setAuthView] = useState("home");
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentPath, setCurrentPath] = useState(
    window.location.pathname || "/"
  );

  function navigate(path) {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    setAuthView("home");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname || "/");
      setAuthView("home");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const access = localStorage.getItem("agriwise_access_token");

      if (!access) {
        if (active) setAuthChecking(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"}/auth/profile/`,
          { headers: { Authorization: `Bearer ${access}`, Accept: "application/json" } }
        );

        if (!response.ok) throw new Error("Session expired");

        const profile = await response.json();
        if (active) {
          setUser(profile);
          localStorage.setItem("agriwise_user", JSON.stringify(profile));
        }
      } catch {
        localStorage.removeItem("agriwise_access_token");
        localStorage.removeItem("agriwise_refresh_token");
        localStorage.removeItem("agriwise_user");
        if (active) setUser(null);
      } finally {
        if (active) setAuthChecking(false);
      }
    }

    restoreSession();
    return () => { active = false; };
  }, []);

  function handleAuthenticated(authUser) {
    setUser(authUser);
    setAuthView("home");
    navigate(
      window.location.pathname.startsWith("/dashboard")
        ? window.location.pathname
        : "/dashboard"
    );
  }

  async function handleLogout() {
    const refresh = localStorage.getItem("agriwise_refresh_token");
    try {
      if (refresh) {
        const { default: api } = await import("./api/client");
        await api.post("/auth/logout/", { refresh });
      }
    } catch (error) {
      console.warn("Server logout could not be confirmed; clearing local session.", error);
    } finally {
      localStorage.removeItem("agriwise_access_token");
      localStorage.removeItem("agriwise_refresh_token");
      localStorage.removeItem("agriwise_user");
      setUser(null);
      setAuthView("home");
      setMenuOpen(false);
      navigate("/");
    }
  }

  const protectedRoute = currentPath.startsWith("/dashboard");

  useEffect(() => {
    if (!authChecking && protectedRoute && !user && authView === "home") {
      setAuthView("login");
    }
  }, [authChecking, protectedRoute, user, authView]);

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8faf5] text-[#45604c]">
        <div className="flex items-center gap-3 rounded-2xl border border-[#e3ebde] bg-white px-5 py-4 text-sm font-semibold shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#dce8d4] border-t-[#356c3e]" />
          Checking your session...
        </div>
      </div>
    );
  }



  if (user && protectedRoute) {
    let pageContent;

    if (currentPath === "/dashboard" || currentPath === "/dashboard/") {
      pageContent = (
        <DashboardHome user={user} onNavigate={navigate} />
      );
    } else if (currentPath === "/dashboard/crop-recommendation") {
      pageContent = <CropRecommendation />;
    } else if (currentPath === "/dashboard/crop-advisory") {
      pageContent = <CropAdvisory />;
    } else if (currentPath === "/dashboard/plant-health") {
      pageContent = <PlantHealth />;
    } else if (currentPath === "/dashboard/history") {
      pageContent = <RecommendationHistory />;
    } else if (currentPath === "/dashboard/farms") {
      pageContent = <MyFarms />;
    } else if (currentPath === "/dashboard/market-insights") {
      pageContent = <MarketInsights />;
    } else {
      const pageNames = {
        "/dashboard/crop-advisory": "Weather & Crop Advisory",
        "/dashboard/plant-health": "Plant Health",
        "/dashboard/market-insights": "Market Insights",
        "/dashboard/farms": "My Farms",
        "/dashboard/history": "Recommendation History",
      };

      const pageName = pageNames[currentPath] || "Page not found";

      pageContent = (
        <section className="mx-auto max-w-4xl rounded-3xl border border-[#e0e9d9] bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#72856d]">
            AgriWise AI workspace
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#193d2b]">
            {pageName}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#71816f]">
            This page has its own navigation route. The next integration step will connect
            it to the corresponding backend endpoint and show its actual response.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-6 rounded-xl bg-[#214e35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#183c2a]"
          >
            Back to overview
          </button>
        </section>
      );
    }

    return (
      <DashboardLayout
        user={user}
        currentPath={currentPath}
        onNavigate={navigate}
        onLogout={handleLogout}
      >
        {pageContent}
      </DashboardLayout>
    );
  }

  if (!user && authView !== "home") {
    return (
      <AuthPage
        onAuthenticated={handleAuthenticated}
        onBack={() => {
          setAuthView("home");
          window.location.hash = "home";
        }}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8faf5] text-[#193d2b]">
      <header className="relative z-20 border-b border-[#e8eee4]/80 bg-[#f8faf5]/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#home" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#214e35] text-[#d6f2bc] shadow-md shadow-green-950/10">
              <Sprout size={23} />
            </div>
            <div>
              <span className="block text-lg font-extrabold tracking-tight">AgriWise<span className="text-[#75a85c]"> AI</span></span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.23em] text-[#849285]">Grow with intelligence</span>
            </div>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a className="text-sm text-[#607263] transition hover:text-[#214e35]" href="#features">Platform</a>
            <a className="text-sm text-[#607263] transition hover:text-[#214e35]" href="#how-it-works">How it works</a>
            <a className="text-sm text-[#607263] transition hover:text-[#214e35]" href="#insights">Insights</a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <BackendStatus />
            {user ? (
              <>
                <span className="text-sm font-semibold text-[#45604c]">
                  Hi, {user.username}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-[#dce7d6] px-4 py-2.5 text-sm font-semibold text-[#45604c] transition hover:bg-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthView("login")}
                className="rounded-full bg-[#214e35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#183c2a]"
              >
                Login
              </button>
            )}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" className="rounded-xl border border-[#dfe8db] p-2 md:hidden">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </nav>
        {menuOpen && (
          <div className="grid gap-1 border-t border-[#e8eee4] bg-white px-5 py-4 md:hidden">
            {["Platform", "How it works", "Insights"].map((label, i) => (
              <a key={label} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm hover:bg-[#f0f6eb]" href={["#features", "#how-it-works", "#insights"][i]}>{label}</a>
            ))}
            {user ? (
              <>
                <div className="rounded-xl px-3 py-2 text-sm font-semibold text-[#45604c]">
                  Signed in as {user.username}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl bg-[#214e35] px-3 py-3 text-center text-sm font-semibold text-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setAuthView("login");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-xl bg-[#214e35] px-3 py-3 text-center text-sm font-semibold text-white"
              >
                Login / Get started
              </button>
            )}
          </div>
        )}
      </header>

      <main id="home">
        <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:px-12 lg:pt-24">
          <div className="pointer-events-none absolute -right-40 -top-16 h-[420px] w-[420px] rounded-full bg-[#dceecf]/60 blur-[100px]" />
          <div className="pointer-events-none absolute -left-40 top-72 h-80 w-80 rounded-full bg-[#e9f0d6]/70 blur-[90px]" />

          <div className="relative grid items-center gap-14 lg:grid-cols-[1fr_1.02fr] lg:gap-12">
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }} className="relative z-10">
              <motion.div variants={reveal} className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dce9d5] bg-white/80 px-4 py-2 shadow-sm shadow-green-950/[0.02]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#79b56a] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4d9856]" />
                </span>
                <span className="text-xs font-semibold tracking-wide text-[#527458]">Smarter decisions start in the soil</span>
              </motion.div>

              <motion.h1 variants={reveal} className="max-w-2xl text-[clamp(2.8rem,6vw,5.3rem)] font-semibold leading-[1.04] tracking-[-0.065em] text-[#183c2a]">
                Grow smarter.
                <br />
                <span className="relative inline-block text-[#6e9f54]">
                  Harvest better.
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 360 14" fill="none" aria-hidden="true">
                    <path d="M3 10C92 1 239 2 355 8" stroke="#B6D49A" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                </span>
              </motion.h1>

              <motion.p variants={reveal} className="mt-7 max-w-xl text-base leading-8 text-[#708074] sm:text-lg">
                Turn soil conditions, weather, plant health and market information into clearer agricultural decisions—with AI built to help you plan your next move.
              </motion.p>

              <motion.div variants={reveal} className="mt-9 flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    if (!user) {
                      setAuthView("login");
                    } else {
                      document.getElementById("crop-recommendation")?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  {user ? "Open AgriWise AI" : "Login / Get started"} <ArrowRight size={17} />
                </Button>
                <Button href="#how-it-works" secondary>Discover how it works</Button>
              </motion.div>

              <motion.div variants={reveal} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#e5ecdf] pt-6">
                <div className="flex -space-x-2">
                  {["#c5dcae", "#e4d5b5", "#8bbd90", "#d2e4c6"].map((color, i) => (
                    <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f8faf5]" style={{ backgroundColor: color }}>
                      <Leaf size={13} className="text-[#355e3e]" />
                    </div>
                  ))}
                </div>
                <p className="max-w-xs text-xs leading-5 text-[#829084]">Designed to bring agricultural intelligence into one practical workspace.</p>
              </motion.div>
            </motion.div>

            <div className="relative">
              <div className="absolute -right-3 top-12 z-10 hidden rounded-2xl border border-white bg-white/95 p-3.5 shadow-xl shadow-green-950/10 sm:block">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#355d3e]"><ShieldCheck size={16} className="text-[#6a9d5b}" /> Data-informed decisions</div>
              </div>
              <DashboardPreview />
              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, duration: 0.6 }} className="absolute -bottom-5 -left-3 z-10 hidden items-center gap-3 rounded-2xl border border-white bg-white/95 p-4 shadow-xl shadow-green-950/10 sm:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6e9] text-[#54834b]"><TrendingUp size={19} /></div>
                <div>
                  <p className="text-xs font-semibold text-[#24472f]">Insights in one place</p>
                  <p className="mt-1 text-[10px] text-[#829084]">Soil · Crops · Weather · Markets</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#e6ede0] bg-white/70">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-[#e6ede0] px-5 sm:px-8 md:grid-cols-4 md:divide-y-0 lg:px-12">
            {[
              { value: "01", label: "Soil & crop intelligence", icon: Sprout },
              { value: "02", label: "Weather-aware guidance", icon: CloudSun },
              { value: "03", label: "Plant health screening", icon: ShieldCheck },
              { value: "04", label: "Market trend insights", icon: BarChart3 },
            ].map((item, i) => (
              <motion.div key={item.value} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 px-3 py-6 sm:px-5 sm:py-7">
                <item.icon size={19} className="shrink-0 text-[#6b9a5b]" />
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-[#91a08e]">{item.value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#365641] sm:text-sm">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <motion.p variants={reveal} className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#70965d]">One connected platform</motion.p>
              <motion.h2 variants={reveal} className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#193d2b] sm:text-5xl">Every decision deserves <span className="text-[#78a75e]">better insight.</span></motion.h2>
            </div>
            <motion.p variants={reveal} className="max-w-md text-sm leading-7 text-[#7a897c]">Explore connected tools that bring important agricultural signals together in one place.</motion.p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <motion.article key={feature.number} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, delay: i * 0.09 }} whileHover={{ y: -8 }} className="group flex min-h-[285px] flex-col rounded-[1.5rem] border border-[#e4ebdf] bg-white p-6 shadow-sm shadow-green-950/[0.02] transition-shadow duration-300 hover:border-[#c8ddbd] hover:shadow-xl hover:shadow-green-950/[0.06]">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6e9] text-[#56864c] transition duration-300 group-hover:rotate-[-5deg] group-hover:bg-[#214e35] group-hover:text-white">
                    <feature.icon size={22} />
                  </div>
                  <span className="text-xs font-semibold tracking-widest text-[#b2bdb0]">{feature.number}</span>
                </div>
                <h3 className="mt-7 text-lg font-semibold leading-snug tracking-tight text-[#23432e]">{feature.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#7b897d]">{feature.text}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[#edf1e9] pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#8a9b87]">{feature.tag}</span>
                  <ArrowUpRight size={17} className="text-[#82a578] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="bg-[#214e35] py-20 text-white sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-12">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
              <motion.p variants={reveal} className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#b9dba5]">From information to action</motion.p>
              <motion.h2 variants={reveal} className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">A more considered way to grow.</motion.h2>
              <motion.p variants={reveal} className="mt-5 max-w-lg text-sm leading-7 text-white/65 sm:text-base">Start with the information you have. Explore recommendations, understand the signals, and make your next decision with greater context.</motion.p>
              <motion.div variants={reveal} className="mt-8"><Button href="#get-started">Explore the workflow <ArrowRight size={17} /></Button></motion.div>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Droplets, title: "Add your soil data", text: "Enter available nutrient, pH and field conditions." },
                { icon: CloudSun, title: "Bring in conditions", text: "Consider weather and seasonal context." },
                { icon: Sprout, title: "Explore crop guidance", text: "Review the recommendation and its context." },
                { icon: BarChart3, title: "Review your insights", text: "Compare available market and farm information." },
              ].map((item, i) => (
                <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.10)" }} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 transition-colors">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#c7e6b4]"><item.icon size={20} /></div>
                  <p className="text-sm font-semibold">{String(i + 1).padStart(2, "0")} / {item.title}</p>
                  <p className="mt-2 text-xs leading-6 text-white/55">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="insights" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#70965d]">Designed for clarity</p>
              <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#193d2b] sm:text-5xl">Less guesswork. <span className="text-[#78a75e]">More context.</span></h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#7a897c]">A useful agricultural workspace should make information easier to understand—not bury it in complicated screens.</p>
              <div className="mt-7 space-y-4">
                {[
                  "A unified view of key agricultural tools",
                  "Visual explanations of available trends",
                  "Farm profiles and saved recommendations",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-[#49654f]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f2df] text-[#52834c]"><ArrowDownRight size={14} /></span>{text}</div>
                ))}
              </div>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-[1.8rem] border border-[#e3ebde] bg-white p-5 shadow-xl shadow-green-950/[0.04] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm font-bold text-[#24472f]">Example market trend</p><p className="mt-1 text-xs text-[#91a08e]">Illustrative index · not current market prices</p></div>
                <span className="rounded-xl bg-[#eff6e9] p-2.5 text-[#57894e]"><BarChart3 size={19} /></span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[#f5f8f1] p-3"><p className="text-[10px] text-[#849285]">Period</p><p className="mt-1 text-sm font-semibold text-[#31573b]">6 months</p></div>
                <div className="rounded-xl bg-[#f5f8f1] p-3"><p className="text-[10px] text-[#849285]">Display</p><p className="mt-1 text-sm font-semibold text-[#31573b]">Trend index</p></div>
                <div className="rounded-xl bg-[#f5f8f1] p-3"><p className="text-[10px] text-[#849285]">Source</p><p className="mt-1 text-sm font-semibold text-[#31573b]">Sample data</p></div>
              </div>
              <div className="mt-6 h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <defs><linearGradient id="marketFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6ea85e" stopOpacity={0.25} /><stop offset="100%" stopColor="#6ea85e" stopOpacity={0.01} /></linearGradient></defs>
                    <CartesianGrid stroke="#edf1e9" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#879687" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#879687" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e4ecdf", fontSize: 12 }} />
                    <Area type="monotone" dataKey="value" name="Example index" stroke="#6b9d57" strokeWidth={3} fill="url(#marketFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </section>

        {user ? (
          <div id="crop-recommendation">
            <CropRecommendation />
          </div>
        ) : (
          <section id="crop-recommendation" className="px-5 py-16 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-4xl rounded-3xl border border-[#dfe9d8] bg-white p-8 text-center shadow-sm sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6e9] text-[#54834b]">
                <Sprout size={26} />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-[#193d2b] sm:text-3xl">
                Your farming workspace starts here
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#708074]">
                Sign in to access crop recommendations and the protected AgriWise AI agricultural tools.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAuthView("login");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mt-6 rounded-full bg-[#214e35] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#183c2a]"
              >
                Login to access tools <ArrowRight size={16} className="ml-2 inline" />
              </button>
            </div>
          </section>
        )}

        <section id="get-started" className="px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#eaf2e1] px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="pointer-events-none absolute -right-12 -top-32 h-80 w-80 rounded-full border-[50px] border-white/40" />
            <div className="pointer-events-none absolute -bottom-44 right-1/3 h-80 w-80 rounded-full bg-[#cfe3be]/50 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#6c9359]">Your next growing season</p>
                <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#193d2b] sm:text-5xl">Make room for smarter farming.</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-[#6d806d]">Explore the AgriWise AI toolkit and bring more context to your agricultural decisions.</p>
              </div>
              <Button
                onClick={() => {
                  if (!user) {
                    setAuthView("login");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    document.getElementById("crop-recommendation")?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                {user ? "Open farming workspace" : "Get started"} <ArrowUpRight size={17} />
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-[#e5ecdf] bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <a href="#home" className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-[#24472f]"><Sprout size={19} className="text-[#6e9f54]" /> AgriWise AI</a>
          <p className="max-w-xl text-xs leading-5 text-[#8a988b]">Agricultural decision support. Recommendations are informational and should be considered alongside local agricultural expertise.</p>
          <p className="text-xs text-[#8a988b]">© {new Date().getFullYear()} AgriWise AI</p>
        </div>
      </footer>
    </div>
  );
}













