import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

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
    <aside className="w-56 bg-slate-900 text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold tracking-tight">InspectRail</h1>
        <p className="text-xs text-slate-400 mt-1">Monitoring Platform</p>
      </div>

      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <p className="text-sm text-slate-300 truncate">{user?.name}</p>
        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
