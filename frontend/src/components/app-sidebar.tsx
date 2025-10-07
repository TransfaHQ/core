import logo from "@/assets/logo.svg";
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
} from "@/components/ui/sidebar";
import { ArrowRightLeft, BookOpen, Tags, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router";

export function AppSidebar() {
  const location = useLocation();

  const menuItems = [
    { icon: BookOpen, label: "Ledgers", path: "/ledgers" },
    { icon: Wallet, label: "Accounts", path: "/accounts" },
    { icon: ArrowRightLeft, label: "Movements", path: "/movements" },
    { icon: Tags, label: "Categories", path: "/categories" },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <img src={logo} className="h-5 m-2 mt-3" alt="Transfa Logo" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                  >
                    <Link to={item.path}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
