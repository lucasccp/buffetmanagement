import { useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/eventos": "Eventos",
  "/equipe": "Equipe",
  "/cardapio": "Cardápio",
  "/caixa": "Caixa",
  "/financeiro": "Financeiro",
  "/calendario": "Calendário",
  "/usuarios": "Usuários",
};

function getPageTitle(pathname: string): string {
  // Match longest prefix
  const matches = Object.keys(pageTitles)
    .filter((k) => pathname === k || pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length);
  return matches[0] ? pageTitles[matches[0]] : "BuffetPro";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center px-4 lg:px-6 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30 gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
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
    </SidebarProvider>
  );
}
