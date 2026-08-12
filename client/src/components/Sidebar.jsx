import { NavLink, useNavigate } from 'react-router-dom';
import { Bot, LayoutDashboard, Clock, UserCircle, LogOut } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history',   icon: Clock,           label: 'History'   },
  { to: '/profile',   icon: UserCircle,      label: 'Profile'   },
];

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
    }
    navigate('/login');
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-[#0d1117] border-r border-white/10 flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 p-2 rounded-xl flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">MeetIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group
              ${isActive
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-gray-500 group-hover:text-rose-400 transition-colors" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
