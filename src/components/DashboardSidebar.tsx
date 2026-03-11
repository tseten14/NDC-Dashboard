import { useState } from "react";
import { cn } from "@/lib/utils";
import { sectors, type Sector } from "@/data/climate-data";
import { LayoutDashboard } from "lucide-react";

interface DashboardSidebarProps {
  selectedSector: string | null;
  onSelectSector: (id: string | null) => void;
}

export function DashboardSidebar({ selectedSector, onSelectSector }: DashboardSidebarProps) {
  return (
    <aside className="w-64 min-h-screen bg-sidebar-dark flex flex-col">
      <div className="p-5 border-b border-sidebar-accent">
        <h1 className="text-lg font-bold text-sidebar-light tracking-tight">
          🌍 NDC Climate
        </h1>
        <p className="text-xs text-sidebar-light/60 mt-0.5">Policy Planning Dashboard</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <button
          onClick={() => onSelectSector(null)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
            selectedSector === null
              ? "bg-sidebar-accent text-accent"
              : "text-sidebar-light/70 hover:bg-sidebar-accent/50 hover:text-sidebar-light"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </button>

        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] uppercase tracking-widest text-sidebar-light/40 font-semibold">
            Sectors
          </span>
        </div>

        {sectors.map((sector) => {
          const Icon = sector.icon;
          return (
            <button
              key={sector.id}
              onClick={() => onSelectSector(sector.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                selectedSector === sector.id
                  ? "bg-sidebar-accent text-accent font-medium"
                  : "text-sidebar-light/70 hover:bg-sidebar-accent/50 hover:text-sidebar-light"
              )}
            >
              <Icon className="h-4 w-4" />
              <div className="text-left">
                <div>{sector.name}</div>
                <div className="text-[10px] opacity-60 leading-tight">{sector.description}</div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
