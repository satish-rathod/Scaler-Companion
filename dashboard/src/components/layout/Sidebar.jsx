import { Link, useLocation } from 'react-router-dom';
import { Home, PlaySquare, Settings, Activity, Search } from 'lucide-react';
import clsx from 'clsx';

const NavItem = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={clsx(
        "flex items-center gap-2 px-3 py-1.5 rounded-sm transition-colors text-sm font-medium",
        isActive
          ? "bg-notion-hover text-notion-text"
          : "text-notion-dim hover:bg-notion-hover hover:text-notion-text"
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </Link>
  );
};

const Sidebar = () => {
  return (
    <div className="w-60 bg-notion-sidebar border-r border-notion-border h-screen flex flex-col fixed left-0 top-0">
      <div className="p-4 flex items-center gap-3 mb-2">
        <div className="w-6 h-6 bg-notion-text rounded-sm flex items-center justify-center text-white font-bold text-xs">
          S
        </div>
        <h1 className="text-sm font-semibold text-notion-text truncate">Scaler Companion</h1>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        <NavItem to="/" icon={Home} label="Library" />
        <NavItem to="/queue" icon={Activity} label="Queue" />
        <NavItem to="/search" icon={Search} label="Search" />
        <div className="pt-4">
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
