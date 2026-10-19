import {
  Sprout,
  CloudSun,
  ScanSearch,
  ShoppingBasket,
  Tractor,
  History,
  LayoutDashboard,
  LogOut,
  Leaf,
} from "lucide-react";

const navigation = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { label: "Crop Recommendation", path: "/dashboard/crop-recommendation", icon: Sprout },
  { label: "Weather & Advisory", path: "/dashboard/crop-advisory", icon: CloudSun },
  { label: "Plant Health", path: "/dashboard/plant-health", icon: ScanSearch },
  { label: "Market Insights", path: "/dashboard/market-insights", icon: ShoppingBasket },
  { label: "My Farms", path: "/dashboard/farms", icon: Tractor },
  { label: "History", path: "/dashboard/history", icon: History },
];

export default function DashboardLayout({
  user,
  currentPath,
  onNavigate,
  onLogout,
  children,
}) {
  return (
    <div className="min-h-screen bg-[#f5f8f1] text-[#193d2b] md:flex">
      <aside className="flex w-full shrink-0 flex-col border-b border-[#e0e9d9] bg-white md:min-h-screen md:w-72 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 border-b border-[#edf1e9] px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#214e35] text-white">
            <Leaf size={24} />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">AgriWise AI</p>
            <p className="text-xs text-[#71816f]">Your farm workspace</p>
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#879582]">
            Workspace
          </p>
          <nav className="flex gap-2 overflow-x-auto md:flex-col">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active =
                currentPath === item.path ||
                (item.path !== "/dashboard" && currentPath.startsWith(item.path + "/"));

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-[#eaf3e4] text-[#214e35]"
                      : "text-[#617160] hover:bg-[#f5f8f1] hover:text-[#214e35]"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto hidden border-t border-[#edf1e9] p-4 md:block">
          <div className="mb-3 rounded-2xl bg-[#f5f8f1] p-3">
            <p className="truncate text-sm font-bold">
              {user?.username || user?.email || "Farmer"}
            </p>
            <p className="mt-1 text-xs text-[#71816f]">Signed in</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#617160] transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#e0e9d9] bg-white/80 px-5 py-4 backdrop-blur md:px-8">
          <div>
            <p className="text-xs font-semibold text-[#71816f]">AGRIWISE WORKSPACE</p>
            <p className="mt-1 text-sm font-bold">Agriculture decision support</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-[#dce7d6] px-3 py-2 text-sm font-semibold text-[#45604c] hover:bg-[#f5f8f1] md:hidden"
          >
            Log out
          </button>
        </header>

        <div className="p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}
