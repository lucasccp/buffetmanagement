import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, Calendar, UtensilsCrossed, UsersRound, Wallet, LogOut, ShieldCheck, CreditCard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const baseNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/equipe", label: "Equipe", icon: UsersRound },
  { to: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { to: "/caixa", label: "Caixa", icon: Wallet },
  { to: "/financeiro", label: "Financeiro", icon: CreditCard },
  { to: "/calendario", label: "Calendário", icon: Calendar },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? [{ to: "/usuarios", label: "Usuários", icon: ShieldCheck }] : []),
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-14 px-4 flex items-center justify-center bg-sidebar">
        {!collapsed ? (
          <span className="text-base font-semibold text-sidebar-primary tracking-tight">BuffetPro</span>
        ) : (
          <span className="text-base font-semibold text-sidebar-primary tracking-tight">B</span>
        )}
      </SidebarHeader>
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary"
                    >
                      <NavLink to={item.to} end>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-sidebar border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
