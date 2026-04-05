import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, UtensilsCrossed, UsersRound, Wallet, Menu, X, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/equipe", label: "Equipe", icon: UsersRound },
  { to: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { to: "/caixa", label: "Caixa", icon: Wallet },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-sidebar flex flex-col transition-transform duration-200 lg:relative lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-5 h-16">
          <span className="text-base font-semibold text-sidebar-primary tracking-tight">BuffetPro</span>
          <button className="lg:hidden text-sidebar-foreground" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-sidebar-border">
          <p className="text-[11px] text-sidebar-foreground/50">© 2026 BuffetPro</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center px-4 lg:px-6 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <button className="lg:hidden mr-3 p-1.5 rounded-md hover:bg-muted" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="lg:hidden text-sm font-semibold text-foreground">BuffetPro</div>
          <div className="ml-auto">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
