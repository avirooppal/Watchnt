import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-tally-bg bg-tally-grid text-tally-text font-sans selection:bg-tally-orange/20 selection:text-tally-orange">
      <header className="relative z-10 border-b border-black/5 bg-tally-bg/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-tally-orange"></div>
            <h1 className="text-2xl font-serif italic tracking-tight font-bold text-tally-text">
              WatchNT
            </h1>
          </div>
          <nav className="flex items-center gap-8 text-sm font-medium text-black/60">
            <Link to="/" className="hover:text-black transition-colors">Meetings</Link>
            <Link to="/settings" className="hover:text-black transition-colors">Settings</Link>
          </nav>
        </div>
      </header>
      
      <main className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 py-16">
        <Outlet />
      </main>
    </div>
  );
}
