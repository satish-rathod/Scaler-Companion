import { Link, useLocation } from 'react-router-dom';
import { Home, PlaySquare, Settings, Activity } from 'lucide-react';
import clsx from 'clsx';

const NavItem = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:bg-gray-50"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const Sidebar = () => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">Scaler Companion</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <NavItem to="/" icon={Home} label="Library" />
        <NavItem to="/queue" icon={Activity} label="Queue" />
      </nav>

      <div className="p-4 border-t border-gray-100">
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </div>
    </div>
  );
};

export default Sidebar;
