import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  History, 
  User, 
  HeartPulse,
  LogOut,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { logout, getHealth } from '../services/api';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShieldCheck, label: 'Safety Check', path: '/safety-check' },
  { icon: History, label: 'History', path: '/history' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = React.useState<string>('Checking...');
  const [dbError, setDbError] = React.useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  const userJson = localStorage.getItem('mediguard_user');
  const token = localStorage.getItem('mediguard_token');
  const user = userJson ? JSON.parse(userJson) : null;

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!token) {
      navigate('/auth');
    } else {
      const checkHealth = async () => {
        try {
          const health = await getHealth();
          setDbStatus(health.mode);
          setDbError(health.error);
        } catch (err) {
          setDbStatus('Connection Error');
        }
      };
      checkHealth();
    }
  }, [token, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-white z-50 md:hidden flex flex-col p-6 border-r border-slate-200"
            >
              <div className="flex items-center justify-between mb-8">
                <Link to="/" className="flex items-center gap-2 text-primary font-bold text-2xl">
                  <ShieldCheck className="w-10 h-10" />
                  <span>MediGuard AI</span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                      location.pathname === item.path
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5",
                      location.pathname === item.path ? "text-primary" : "text-slate-400"
                    )} />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto border-t border-slate-100 pt-4">
                <button 
                  onClick={handleLogout}
                  className="px-4 py-3 w-full text-slate-500 hover:text-red-600 transition-colors font-bold text-sm text-left"
                >
                  Log Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop) */}
      <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-2 text-primary font-bold text-2xl tracking-tight">
            <ShieldCheck className="w-10 h-10" />
            <span>MediGuard AI</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {location.pathname === item.path && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute left-0 w-1.5 h-6 bg-primary rounded-r-full"
                />
              )}
              <item.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                location.pathname === item.path ? "text-primary" : "text-slate-400"
              )} />
              <span className="font-semibold text-sm tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="px-6 py-4 w-full text-slate-500 hover:text-red-500 transition-all font-bold text-sm hover:bg-red-50 rounded-2xl text-left"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-slate-50 rounded-lg md:hidden shrink-0"
            >
              <Menu className="w-6 h-6 text-slate-500" />
            </button>
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl w-full max-w-[140px] sm:max-w-xs md:max-w-md transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white focus-within:shadow-sm">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-xs md:text-sm w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 md:gap-6 ml-4">
            <button className="relative text-slate-400 hover:text-primary hover:bg-primary/5 p-2 rounded-xl transition-all">
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              <span className="absolute top-1 right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[8px] md:text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                3
              </span>
            </button>
            <Link 
              to="/profile"
              className="flex items-center gap-2 md:gap-3 group hover:bg-slate-50 p-1 md:p-1.5 rounded-2xl transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs md:text-sm font-bold text-slate-900 group-hover:text-primary transition-colors leading-none">{user?.name?.split(' ')[0] || 'Guest'}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Account</p>
              </div>
              <div className="w-8 h-8 md:w-11 md:h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs md:text-sm group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                {user ? getInitials(user.name) : '??'}
              </div>
            </Link>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
