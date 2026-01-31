import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useThemeStore } from '@/stores/themeStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/scanner', label: 'Scan Document', icon: '📷' },
  { path: '/transactions', label: 'Transactions', icon: '💳' },
  { path: '/accounts', label: 'Accounts', icon: '🏦' },
  { path: '/categories', label: 'Categories', icon: '🏷️' },
  { path: '/budgets', label: 'Budgets', icon: '📈' },
  { path: '/goals', label: 'Goals', icon: '🎯' },
  { path: '/bills', label: 'Recurring', icon: '🔄' },
  { path: '/reports', label: 'Reports', icon: '📉' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Budget Tracker</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  )
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
        >
          {theme === 'light' ? '🌙' : '☀️'}
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">v0.1.0</p>
      </div>
    </aside>
  );
}
