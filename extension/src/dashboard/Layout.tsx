import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-signal-ink text-text-primary font-sans selection:bg-accent-amber/20">
      <header className="sticky top-0 z-50 border-b border-border-strong bg-signal-ink/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="WatchNT" className="w-6 h-6 rounded-none object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
            <h1 className="text-sm font-display font-semibold tracking-wide uppercase">WatchNT</h1>
          </Link>
          <nav className="flex items-center gap-8 text-xs font-mono tracking-widest uppercase">
            <Link 
              to="/" 
              className={`transition-colors duration-300 ${location.pathname === '/' || location.pathname.startsWith('/meeting') ? 'text-accent-amber' : 'text-text-muted hover:text-text-primary'}`}
            >
              Library
            </Link>
            <Link 
              to="/settings" 
              className={`transition-colors duration-300 ${location.pathname.startsWith('/settings') ? 'text-accent-amber' : 'text-text-muted hover:text-text-primary'}`}
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="relative z-10 w-full">
        <Outlet />
      </main>
    </div>
  );
}
