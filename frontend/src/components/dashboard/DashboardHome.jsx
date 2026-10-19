import {
  Sprout,
  CloudSun,
  ScanSearch,
  ShoppingBasket,
  Tractor,
  History,
  ArrowUpRight,
  Leaf,
} from "lucide-react";

const features = [
  {
    title: "Crop Recommendation",
    description: "Get a crop prediction from soil nutrients, temperature, humidity, pH, and rainfall.",
    path: "/dashboard/crop-recommendation",
    icon: Sprout,
    tag: "Machine learning",
  },
  {
    title: "Weather & Advisory",
    description: "Explore crop advisory using the backend's available advisory service.",
    path: "/dashboard/crop-advisory",
    icon: CloudSun,
    tag: "Crop guidance",
  },
  {
    title: "Plant Health",
    description: "Identify plants and screen uploaded crop images for possible disease symptoms.",
    path: "/dashboard/plant-health",
    icon: ScanSearch,
    tag: "Image analysis",
  },
  {
    title: "Market Insights",
    description: "Access market price information and crop market analytics.",
    path: "/dashboard/market-insights",
    icon: ShoppingBasket,
    tag: "Market data",
  },
  {
    title: "My Farms",
    description: "Open your farm management workspace and available farm records.",
    path: "/dashboard/farms",
    icon: Tractor,
    tag: "Farm management",
  },
  {
    title: "Recommendation History",
    description: "Review saved recommendation records returned by the backend.",
    path: "/dashboard/history",
    icon: History,
    tag: "Your records",
  },
];

export default function DashboardHome({ user, onNavigate }) {
  const displayName = user?.username || user?.email || "Farmer";

  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative overflow-hidden rounded-[28px] bg-[#214e35] p-7 text-white md:p-10">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-36 h-56 w-56 rounded-full bg-[#a9d48c]/10 blur-2xl" />

        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d8edcb]">
            <Leaf size={14} />
            Your agriculture workspace
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            Welcome back, {displayName}.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 md:text-base">
            Choose a tool to continue. Each feature has its own workspace, so you can switch
            between crop decisions, plant health, markets, and farm records.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("/dashboard/crop-recommendation")}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#d7edc7] px-5 py-3 text-sm font-bold text-[#214e35] transition hover:bg-white"
          >
            Start crop recommendation
            <ArrowUpRight size={17} />
          </button>
        </div>
      </section>

      <section className="mt-9">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#72856d]">
              Your tools
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Explore features</h2>
          </div>
          <p className="text-sm text-[#71816f]">Select any card to open its page.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <button
                key={feature.path}
                type="button"
                onClick={() => onNavigate(feature.path)}
                className="group rounded-2xl border border-[#e0e9d9] bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#b8d2ac] hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf5e8] text-[#356c3e] transition group-hover:bg-[#214e35] group-hover:text-white">
                    <Icon size={23} />
                  </div>
                  <ArrowUpRight size={19} className="text-[#8da087] transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#214e35]" />
                </div>

                <p className="mt-5 text-lg font-extrabold">{feature.title}</p>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-[#71816f]">
                  {feature.description}
                </p>
                <span className="mt-4 inline-flex rounded-full bg-[#f3f7ef] px-3 py-1.5 text-xs font-semibold text-[#54724e]">
                  {feature.tag}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
