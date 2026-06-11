import React from "react";
import { Link } from "wouter";
import { Coffee, Calendar, MapPin, ShieldCheck } from "lucide-react";

export function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-20 lg:w-64 bg-sidebar text-sidebar-foreground flex-shrink-0 flex flex-col md:min-h-screen transition-all duration-300 border-r border-sidebar-border group">
        <div className="p-4 flex items-center justify-center lg:justify-start gap-3 h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <Coffee className="w-6 h-6" />
            <span className="font-bold text-lg tracking-tight hidden lg:block text-sidebar-foreground">VendingPro</span>
          </div>
        </div>
        <nav className="flex-1 p-2 md:p-4 space-y-1 overflow-y-auto flex md:flex-col justify-center md:justify-start">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground justify-center lg:justify-start">
            <MapPin className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium hidden lg:block">Machine Load</span>
          </Link>
          <Link href="/operator/schedule" className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground justify-center lg:justify-start">
            <Calendar className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium hidden lg:block">Schedule</span>
          </Link>
          <div className="pt-2 mt-2 border-t border-sidebar-border/50">
            <Link href="/admin/login" className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground justify-center lg:justify-start">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium hidden lg:block text-sm">Admin Panel</span>
            </Link>
          </div>
        </nav>
      </aside>
      <main className="flex-1 overflow-x-hidden relative">
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
