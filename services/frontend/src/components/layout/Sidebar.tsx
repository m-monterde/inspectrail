import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '□' },
  { to: '/journeys', label: 'Trayectos', icon: '⟶' },
  { to: '/alerts', label: 'Alertas', icon: '△' },
  { to: '/systems', label: 'Sistemas', icon: '◎' },
  { to: '/thresholds', label: 'Umbrales', icon: '⊞' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen border-r">
      <div className="p-4">
        <h1 className="text-lg font-bold tracking-tight">InspectRail</h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Monitoring Platform</p>
      </div>

      <Separator />

      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="p-4">
        <p className="text-sm truncate">{user?.name}</p>
        <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
        <Button variant="ghost" size="sm" className="mt-2 h-auto p-0 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={logout}>
          Cerrar sesion
        </Button>
      </div>
    </aside>
  );
}
