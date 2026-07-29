import { Link, NavLink, Outlet } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, Car, Wrench, FileText, Search, Briefcase, Shield } from "lucide-react";

const navItems = [
  { to: "/garage", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/garage/vehicles", label: "Vehicles", icon: Car },
  { to: "/garage/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/garage/jobs", label: "Jobs", icon: Briefcase },
  { to: "/garage/coverage", label: "Coverage", icon: Shield },
  { to: "/garage/documents", label: "Documents", icon: FileText },
  { to: "/garage/mechanics", label: "Mechanics", icon: Search },
];

export default function GarageLayout() {
  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Minimal back-to-dashboard bar, replacing the full public nav */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 h-12 flex items-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Back to Home Base
          </Link>
        </div>
      </div>

      {/* Garage strip */}
      <div className="bg-foreground text-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">My Garage</span>
          </div>
          <span className="text-xs text-background/60 hidden sm:inline">Vehicles &amp; motorcycles</span>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="bg-background border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-2 overflow-x-auto">
          <ul className="flex gap-1 min-w-max">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                      isActive
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  <Icon size={15} /> {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
