import { useState, useRef } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import {
  useSettingsStore,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  FIRST_DAY_OPTIONS,
  Currency,
  DateFormat,
  FirstDayOfWeek,
} from '@/stores/settingsStore';
import { backupService } from '@/infrastructure/api/backupService';

export default function Settings() {
  const { theme, setTheme } = useThemeStore();
  const { currency, dateFormat, firstDayOfWeek, setCurrency, setDateFormat, setFirstDayOfWeek } =
    useSettingsStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setImportStatus(null);
    try {
      await backupService.downloadExport();
    } catch (err) {
      console.error('Export failed:', err);
      setImportStatus({ type: 'error', message: 'Export failed. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    try {
      const result = await backupService.importFromFile(file);
      if (result.success) {
        setImportStatus({ type: 'success', message: 'Data restored successfully! Refresh the page to see your data.' });
      } else {
        setImportStatus({ type: 'error', message: result.error || 'Import failed' });
      }
    } catch (err) {
      console.error('Import failed:', err);
      setImportStatus({ type: 'error', message: 'Import failed. Please check the file format.' });
    } finally {
      setIsImporting(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-slate-500 dark:text-slate-400">Configure your preferences</p>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
        <SettingRow
          title="Currency"
          description="Choose your default currency"
        >
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            aria-label="Currency"
            className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-primary-500"
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow
          title="Date Format"
          description="How dates are displayed"
        >
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value as DateFormat)}
            aria-label="Date format"
            className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-primary-500"
          >
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow
          title="First Day of Week"
          description="When your week starts"
        >
          <select
            value={firstDayOfWeek}
            onChange={(e) => setFirstDayOfWeek(e.target.value as FirstDayOfWeek)}
            aria-label="First day of week"
            className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-primary-500"
          >
            {FIRST_DAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow
          title="Theme"
          description="Choose light or dark mode"
        >
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
            aria-label="Theme"
            className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-primary-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </SettingRow>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Data Management</h3>
        <div className="space-y-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {isExporting ? 'Exporting...' : 'Export Data'}
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">Download a complete backup of your data</p>
          </button>
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {isImporting ? 'Importing...' : 'Import Data'}
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">Restore from a backup file</p>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            aria-label="Import backup file"
            className="hidden"
          />
          {importStatus && (
            <div
              className={`p-3 rounded-lg text-sm ${
                importStatus.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}
            >
              {importStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SettingRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  );
}
