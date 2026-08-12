import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Building2,
  LogOut,
  ShieldCheck,
  Eye,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/talent", label: "Talent List", icon: Users, testid: "nav-talent" },
  { to: "/movement", label: "Talent Movement", icon: ArrowLeftRight, testid: "nav-movement" },
  { to: "/units", label: "Master Work Unit", icon: Building2, testid: "nav-units" },
];

const PAGE_TITLES = {
  "/": "Employee Demographics",
  "/talent": "Talent List",
  "/movement": "Talent Movement",
  "/units": "Master Work Unit",
};

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || "Talent Management";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-[#0B1120] text-slate-100 flex flex-col fixed h-screen z-30">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-accent flex items-center justify-center font-heading font-black text-white text-lg rounded-sm">
              PP
            </div>
            <div className="leading-tight">
              <p className="font-heading font-black text-sm tracking-tight">PP PRESISI</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Talent System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          <p className="label-caps px-3 mb-3 text-slate-500">Menu</p>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-3 rounded-sm bg-white/5">
            <div className="h-8 w-8 rounded-sm bg-primary flex items-center justify-center text-xs font-bold uppercase">
              {(user?.name || "U").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" data-testid="user-name">{user?.name}</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {isAdmin ? "Admin" : "Viewer"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="logout-btn"
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 sticky top-0 z-20">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">PT PP Presisi Tbk</p>
            <h1 className="font-heading font-bold text-xl tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
          </div>
          {!isAdmin && (
            <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-border px-3 py-1.5 rounded-sm">
              Read-Only Access
            </span>
          )}
        </header>

        <main className="flex-1 p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
