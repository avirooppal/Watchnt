import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
        const res = await fetch(`${storedBackend}/health`, { signal: AbortSignal.timeout(2000) });
        setBackendOnline(res.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-signal-ink text-text-primary font-sans selection:bg-accent-amber/20 flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border-hairline bg-signal-surface/90 backdrop-blur-md">
        <div className="w-full px-6 sm:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/logo.png" alt="WatchNT" className="w-7 h-7 rounded-lg object-cover" />
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">WatchNT</h1>
                <span className="text-xs text-text-muted font-normal">meeting copilot</span>
              </div>
            </Link>

            {/* Backend Health Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-signal-surface-raised border border-border-hairline text-xs">
              <span className={`w-2 h-2 rounded-full ${
                backendOnline === true ? 'bg-state-success' :
                backendOnline === false ? 'bg-state-danger' : 'bg-state-warning animate-pulse'
              }`} />
              <span className="text-text-secondary font-mono text-xs">
                {backendOnline === true ? 'Engine Online' : backendOnline === false ? 'Engine Offline' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1.5">
              <Link 
                to="/" 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/' || location.pathname.startsWith('/meeting') 
                    ? 'bg-signal-surface-raised text-white border border-border-hairline shadow-sm' 
                    : 'text-text-secondary hover:text-white hover:bg-signal-surface-raised'
                }`}
              >
                Notes & Library
              </Link>
              <Link 
                to="/settings" 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/settings') 
                    ? 'bg-signal-surface-raised text-white border border-border-hairline shadow-sm' 
                    : 'text-text-secondary hover:text-white hover:bg-signal-surface-raised'
                }`}
              >
                Settings
              </Link>
            </nav>

            <div className="h-4 w-px bg-border-strong hidden sm:block" />

            {/* External Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/avirooppal/Watchnt"
                target="_blank"
                rel="noreferrer"
                className="text-text-muted hover:text-text-primary text-xs flex items-center gap-1.5 transition-colors"
                title="GitHub Repository"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span className="hidden md:inline font-mono text-[11px]">v0.2.0</span>
              </a>
            </div>
          </div>

        </div>
      </header>
      
      <main className="relative z-10 w-full flex-1">
        <Outlet />
      </main>
    </div>
  );
}

