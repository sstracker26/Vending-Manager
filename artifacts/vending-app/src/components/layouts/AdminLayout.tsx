import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Coffee, LogOut, LayoutDashboard, Users, Container, Package, ArrowRightLeft, UserCircle, CalendarDays, Receipt, FileText, ActivitySquare, History } from "lucide-react";
import { useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isModerator, session, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!isLoading && !session) {
      setLocation("/admin/login");
    }
  }, [isLoading, session, setLocation]);

  if (isLoading || !session) return null;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      }
    });
  };

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/clients", label: "Clients", icon: Users },
    { href: "/admin/machines", label: "Machines", icon: Container },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/stock", label: "Stock", icon: ArrowRightLeft },
    { href: "/admin/machine-loads", label: "Machine Loads", icon: History },
    { href: "/admin/operators", label: "Operators", icon: UserCircle },
    { href: "/admin/schedules", label: "Schedules", icon: CalendarDays },
    { href: "/admin/expenses", label: "Expenses", icon: Receipt },
    { href: "/admin/reports", label: "Reports", icon: FileText },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin/logs", label: "Logs", icon: ActivitySquare });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-sidebar text-sidebar-foreground flex-shrink-0 flex flex-col md:min-h-screen border-r border-sidebar-border">
        <div className="p-4 flex items-center justify-between md:justify-start gap-3 border-b border-sidebar-border h-16">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <Coffee className="w-6 h-6" />
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground">VendingPro</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm">
              <p className="font-medium">{session.operatorName}</p>
              <p className="text-sidebar-foreground/60 capitalize text-xs">{session.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-sidebar-foreground border-sidebar-border bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden relative">
        <div className="absolute inset-0 bg-background/50 pointer-events-none -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] opacity-50"></div>
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
