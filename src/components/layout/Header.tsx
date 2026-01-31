import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/scanner': 'Scan Document',
  '/transactions': 'Transactions',
  '/accounts': 'Accounts',
  '/categories': 'Categories',
  '/budgets': 'Budgets',
  '/goals': 'Goals',
  '/bills': 'Bills',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Budget Tracker';

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>
    </header>
  );
}
