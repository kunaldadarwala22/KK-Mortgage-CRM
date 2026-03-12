import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  KanbanSquare,
  PoundSterling,
  CheckSquare,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  Bell,
  ChevronDown,
  Search,
  Download,
  ClipboardList,
  AlertTriangle,
  Clock,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { Input } from './ui/input';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_broker-crm-uk/artifacts/fwvsstux_LOOGOO.png';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/cases', label: 'Cases', icon: Briefcase },
  { path: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { path: '/commission', label: 'Commission', icon: PoundSterling },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/reports', label: 'Reports', icon: ClipboardList },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/export', label: 'Export', icon: Download },
];

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setNotifCount(data.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setSearchOpen(true);
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSelect = (type, id) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (type === 'client') navigate(`/clients/${id}`);
    else if (type === 'case') navigate(`/cases/${id}`);
  };

  const NavLink = ({ item, onClick }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
        }`}
        data-testid={`nav-${item.label.toLowerCase()}`}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  const severityIcon = (severity) => {
    if (severity === 'high') return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
    return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-gradient-to-b from-slate-900 to-slate-800 overflow-y-auto">
          <div className="flex items-center justify-center h-20 px-4 border-b border-slate-700/50">
            <img src={LOGO_URL} alt="KK Mortgage Solutions" className="h-14 object-contain" />
          </div>
          <nav className="flex-1 px-3 py-6 space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-slate-700/50">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="h-10 w-10 border-2 border-slate-600">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-red-600 text-white">{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400">Advisor</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-4 h-16">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-gradient-to-b from-slate-900 to-slate-800">
              <div className="flex items-center justify-center h-20 px-4 border-b border-slate-700/50">
                <img src={LOGO_URL} alt="KK Mortgage Solutions" className="h-12 object-contain" />
              </div>
              <nav className="px-3 py-6 space-y-1">
                {navItems.map((item) => (
                  <NavLink key={item.path} item={item} onClick={() => setMobileOpen(false)} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <img src={LOGO_URL} alt="KK Mortgage Solutions" className="h-10 object-contain" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.picture} />
                  <AvatarFallback className="bg-red-600 text-white text-xs">{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar - Desktop */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 flex-1 max-w-xl relative" ref={searchRef}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search clients, cases..."
                className="pl-10 bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400 border-slate-200"
                data-testid="global-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults) setSearchOpen(true); }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchOpen && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-96 overflow-y-auto" data-testid="search-results">
                {searchResults.clients?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">CLIENTS</div>
                    {searchResults.clients.map((c) => (
                      <button
                        key={c.client_id}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                        data-testid={`search-result-client-${c.client_id}`}
                        onClick={() => handleSearchSelect('client', c.client_id)}
                      >
                        <Users className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                          <p className="text-xs text-slate-500">{c.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.cases?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">CASES</div>
                    {searchResults.cases.map((c) => (
                      <button
                        key={c.case_id}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                        data-testid={`search-result-case-${c.case_id}`}
                        onClick={() => handleSearchSelect('case', c.case_id)}
                      >
                        <Briefcase className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium">{c.client_name}</p>
                          <p className="text-xs text-slate-500">{c.case_id} - {c.product_type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {(!searchResults.clients?.length && !searchResults.cases?.length) && (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">No results found</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleDarkMode} title="Toggle dark mode">
              {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-500" />}
            </Button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <Button
                variant="ghost" size="icon" className="relative"
                data-testid="notifications-btn"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell className="h-5 w-5 text-slate-500" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-600 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </Button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-[420px] overflow-y-auto" data-testid="notifications-dropdown">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
                    <span className="text-xs text-slate-500">{notifCount} items</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications</div>
                  ) : (
                    notifications.map((n, idx) => (
                      <button
                        key={idx}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left border-b border-slate-50 dark:border-slate-700 last:border-0"
                        data-testid={`notification-${idx}`}
                        onClick={() => { if (n.link) navigate(n.link); setNotifOpen(false); }}
                      >
                        {severityIcon(n.severity)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.description}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-btn">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-red-600 text-white text-xs">{getInitials(user?.name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{user?.name}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="pt-16 lg:pt-0 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
