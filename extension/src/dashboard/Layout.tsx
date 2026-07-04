import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-signal-ink text-text-primary font-sans selection:bg-accent-amber/20">
      <header className="sticky top-0 z-50 border-b border-border-hairline bg-signal-ink/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-accent-amber/10 group-hover:bg-accent-amber/20 transition-colors">
              <svg className="w-3.5 h-3.5 text-accent-amber-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h1 className="text-sm font-bold tracking-tight">WatchNT</h1>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link 
              to="/" 
              className={`transition-colors ${location.pathname === '/' || location.pathname.startsWith('/meeting') ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
            >
              Library
            </Link>
            <Link 
              to="/settings" 
              className={`transition-colors ${location.pathname.startsWith('/settings') ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
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
