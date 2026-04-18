import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  FileText,
  History,
  LogOut,
  FilePlus2,
  Loader2,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { LangSwitcher } from "@/components/lang-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { t } = useTranslation();
  const { session, loading, fullName, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    if (typeof window !== "undefined") {
      navigate({ to: "/login" });
    }
    return null;
  }

  const navItems = [
    { to: "/app", label: t("nav.dashboard"), icon: LayoutDashboard, exact: true },
    { to: "/app/employees", label: t("nav.employees"), icon: Users },
    { to: "/app/templates", label: t("nav.templates"), icon: FileText },
    { to: "/app/generate", label: t("nav.generate"), icon: FilePlus2 },
    { to: "/app/history", label: t("nav.history"), icon: History },
  ];

  const initials = (fullName || session.user.email || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1 p-3">
      {navItems.map((item) => {
        const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-cyber text-white shadow-glow-cyan"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 flex-shrink-0 border-e border-sidebar-border bg-sidebar md:block">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <BrandLogo size="md" />
        </div>
        <NavList />
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="start" className="w-64 bg-sidebar p-0">
                <div className="flex h-16 items-center border-b border-sidebar-border px-5">
                  <BrandLogo size="md" />
                </div>
                <NavList onClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="md:hidden">
              <BrandLogo size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LangSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-cyber text-xs font-bold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-start text-xs sm:block">
                    <div className="font-medium">{fullName || session.user.email}</div>
                    <div className="uppercase text-muted-foreground">{role}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="text-sm">{fullName || "User"}</div>
                  <div className="text-xs font-normal text-muted-foreground">{session.user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                  className="text-destructive"
                >
                  <LogOut className="me-2 h-4 w-4" />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
