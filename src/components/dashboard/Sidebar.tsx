import { Compass, BarChart3, Globe, MapPin, Wand2, Sparkles, Users, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarView = "explorar" | "estadisticas" | "negocios-web" | "cp" | "crm" | "webs" | "cola";

const navItems: { id: SidebarView; label: string; icon: any }[] = [
  { id: "explorar", label: "Explorar", icon: Compass },
  { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
  { id: "negocios-web", label: "Negocios con web", icon: Globe },
  { id: "cp", label: "Búsqueda por CP", icon: MapPin },
  { id: "cola", label: "Cola de leads", icon: Flame },
  { id: "crm", label: "CRM", icon: Users },
  { id: "webs", label: "Webs creadas", icon: Wand2 },
];

interface Props {
  active: SidebarView;
  onChange: (v: SidebarView) => void;
}

export const Sidebar = ({ active, onChange }: Props) => {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-sidebar-accent-foreground">LeadFinder</span>
          <span className="text-[11px] text-muted-foreground">Local Business Suite</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
              <span>{item.label}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="rounded-lg bg-sidebar-accent/60 p-3">
          <p className="text-xs font-medium text-sidebar-accent-foreground">Plan Pro</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">125 / 500 leads usados</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-background overflow-hidden">
            <div className="h-full w-1/4 bg-primary" />
          </div>
        </div>
      </div>
    </aside>
  );
};
