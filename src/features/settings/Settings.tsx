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
import { ImportResult } from '@/infrastructure/api/backupService';
import ExportOptionsModal from './ExportOptionsModal';
import ImportOptionsModal from './ImportOptionsModal';
import ImportResultsModal from './ImportResultsModal';

export default function Settings() {
  const { theme, setTheme } = useThemeStore();
  const { currency, dateFormat, firstDayOfWeek, setCurrency, setDateFormat, setFirstDayOfWeek } =
    useSettingsStore();

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowImportModal(true);
    }
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportComplete = (result: ImportResult) => {
    setImportResult(result);
    setShowResultsModal(true);
  };

  const handleImportModalClose = () => {
    setShowImportModal(false);
    setSelectedFile(null);
  };

  const handleResultsModalClose = () => {
    setShowResultsModal(false);
    setImportResult(null);
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
            onClick={handleExportClick}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="font-medium text-slate-700 dark:text-slate-200">Export Data</span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Download backup as JSON or CSV, with optional encryption
            </p>
          </button>
          <button
            onClick={handleImportClick}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="font-medium text-slate-700 dark:text-slate-200">Import Data</span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Restore from backup file, with merge or replace options
            </p>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            aria-label="Import backup file"
            className="hidden"
          />
        </div>
      </div>

      {/* Modals */}
      <ExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <ImportOptionsModal
        isOpen={showImportModal}
        onClose={handleImportModalClose}
        file={selectedFile}
        onImportComplete={handleImportComplete}
      />

      <ImportResultsModal
        isOpen={showResultsModal}
        onClose={handleResultsModalClose}
        result={importResult}
      />
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
