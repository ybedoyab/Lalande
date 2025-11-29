import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavLink {
  path: string;
  label: string;
  icon?: string;
}

const NAV_LINKS: NavLink[] = [
  { path: '/', label: 'Inicio' },
  { path: '/materials', label: 'Materiales' },
  { path: '/mars', label: 'Datos de Marte', icon: '🪐' },
  { path: '/espacio', label: 'Espacio', icon: '🛰️' },
  { path: '/colony', label: 'Colonia', icon: '🏛️' },
];

/**
 * Header Component
 * Follows Single Responsibility Principle - handles header display and navigation
 * Follows DRY principle - uses constants for navigation links
 */
export const Header = () => {
  const location = useLocation();
  const [theme, setTheme] = useState<string>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'corporate' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="glass-panel flex flex-wrap items-center justify-between gap-4 px-5 py-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl overflow-hidden bg-primary/20">
          <span className="text-2xl">🚀</span>
          <span className="pointer-events-none absolute inset-0 rounded-2xl border border-primary/30 motion-safe:animate-ping" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-base-content">Colonia Marciana </span>
            <span className="text-primary font-bold">LALANDE</span>
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap items-center gap-2">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
              >
                {link.icon && <span className="mr-1">{link.icon}</span>}
                {link.label}
              </Link>
            );
          })}
        </nav>
        
        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-circle btn-ghost"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.536-7.536-1.414 1.414M7.879 16.95l-1.414 1.414m0-12.728 1.414 1.414m9.193 9.193 1.414 1.414" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};

