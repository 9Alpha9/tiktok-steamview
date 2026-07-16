"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  History, 
  BarChart2, 
  Star, 
  Bell,
  Settings,
  Link,
  FileText,
  ChevronLeft,
  CirclePlay
} from "lucide-react";
import { motion } from "framer-motion";

const mainNav = [
  { title: "Dashboard", icon: LayoutDashboard, active: true },
  { title: "Live Now", icon: Video },
  { title: "All Accounts", icon: Users },
  { title: "History", icon: History },
  { title: "Analytics", icon: BarChart2 },
  { title: "Favorites", icon: Star },
  { title: "Alerts", icon: Bell },
];

const managementNav = [
  { title: "Accounts", icon: Users },
  { title: "Categories", icon: LayoutDashboard },
  { title: "Tags", icon: Star },
];

const systemNav = [
  { title: "Users", icon: Users },
  { title: "Settings", icon: Settings },
  { title: "Integrations", icon: Link },
  { title: "Logs", icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="w-[240px] border-r border-border bg-background flex flex-col h-full sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border/50 shrink-0">
        <CirclePlay className="w-6 h-6 text-brand-primary mr-2" />
        <span className="font-bold text-sm tracking-wide">TikTok Live Monitor</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
        {/* Main Nav */}
        <div className="space-y-1">
          {mainNav.map((item) => (
            <NavItem key={item.title} {...item} />
          ))}
        </div>

        {/* Management Nav */}
        <div>
          <h4 className="px-3 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
            Management
          </h4>
          <div className="space-y-1">
            {managementNav.map((item) => (
              <NavItem key={item.title} {...item} />
            ))}
          </div>
        </div>

        {/* System Nav */}
        <div>
          <h4 className="px-3 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
            System
          </h4>
          <div className="space-y-1">
            {systemNav.map((item) => (
              <NavItem key={item.title} {...item} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-border/50 shrink-0">
        <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chart-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-chart-green"></span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white">System Status</span>
            <span className="text-[10px] text-text-muted">All systems operational</span>
          </div>
        </div>
        
        <button className="mt-4 flex items-center text-xs text-text-muted hover:text-white transition-colors w-full px-2">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Collapse
        </button>
      </div>
    </aside>
  );
}

function NavItem({ title, icon: Icon, active }: { title: string; icon: React.ElementType; active?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors",
        active
          ? "bg-gradient-to-r from-chart-purple/20 to-transparent text-chart-purple font-medium"
          : "text-text-muted hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className={cn("w-4 h-4 mr-3", active ? "text-chart-purple" : "text-text-muted")} />
      {title}
    </motion.button>
  );
}
