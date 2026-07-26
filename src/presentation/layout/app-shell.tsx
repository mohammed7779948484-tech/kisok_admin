import {
  BoxesIcon,
  ClipboardListIcon,
  GaugeIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PackageIcon,
  SettingsIcon,
  ShapesIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { Link, Outlet, useLocation } from "react-router";
import type { AdminIdentity } from "@/infrastructure/supabase/auth-provider";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboardIcon },
  { label: "Brands", path: "/brands", icon: TagsIcon },
  { label: "Categories", path: "/categories", icon: ShapesIcon },
  { label: "Products", path: "/products", icon: PackageIcon },
  { label: "Media", path: "/media", icon: ImagesIcon },
  { label: "Inventory", path: "/inventory", icon: BoxesIcon },
  { label: "Orders", path: "/orders", icon: ClipboardListIcon },
  { label: "Users", path: "/users", icon: UsersIcon },
  { label: "Store settings", path: "/settings", icon: SettingsIcon },
];

export function AppShell() {
  const location = useLocation();
  const { data: identity } = useGetIdentity<AdminIdentity>();
  const { mutate: logout } = useLogout();
  const pageName =
    navigation.find((item) =>
      item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path),
    )?.label ?? "Kiosk Admin";
  const initials = (identity?.display_name || "Admin")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link to="/" />}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GaugeIcon />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Kiosk Admin</span>
                  <span className="truncate text-xs">Operations console</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => (
                  <NavigationItem
                    isActive={
                      item.path === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(item.path)
                    }
                    item={item}
                    key={item.path}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<SidebarMenuButton size="lg" />}
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {identity?.display_name ?? "Administrator"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {identity?.email ?? ""}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="min-w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Administrator</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => logout()}>
                      <LogOutIcon />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium">{pageName}</span>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NavigationItem({
  item,
  isActive,
}: {
  item: (typeof navigation)[number];
  isActive: boolean;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={<Link onClick={() => setOpenMobile(false)} to={item.path} />}
        tooltip={item.label}
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
