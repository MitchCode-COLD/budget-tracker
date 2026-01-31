import { api } from './client';

// Types
export interface BackupData {
  version: number;
  exportedAt: string;
  encrypted?: boolean;
  data: {
    accounts: unknown[];
    categories: unknown[];
    transactions: unknown[];
    bills: unknown[];
    goals: unknown[];
    goalContributions: unknown[];
    budgets: unknown[];
    recurringPatterns: unknown[];
  };
  metadata: {
    totalAccounts: number;
    totalTransactions: number;
    totalGoals: number;
    totalBills: number;
  };
}

export interface ExportOptions {
  format: 'json' | 'csv';
  scope: 'all' | 'transactions' | 'accounts' | 'categories';
  dateRange?: {
    startDate: number;
    endDate: number;
  };
  encrypted?: boolean;
  password?: string;
  dateFormat?: string;
}

export interface ImportOptions {
  mode: 'replace' | 'merge';
  password?: string;
}

export interface ImportResult {
  success: boolean;
  mode: 'replace' | 'merge';
  summary: {
    accountsAdded: number;
    accountsSkipped: number;
    categoriesAdded: number;
    categoriesSkipped: number;
    transactionsAdded: number;
    transactionsSkipped: number;
    billsAdded: number;
    billsSkipped: number;
    goalsAdded: number;
    goalsSkipped: number;
    budgetsAdded: number;
    budgetsSkipped: number;
    patternsAdded: number;
    patternsSkipped: number;
    contributionsAdded: number;
    contributionsSkipped: number;
  };
  errors: Array<{
    entity: string;
    id: string;
    field?: string;
    message: string;
  }>;
}

export const backupService = {
  async export(): Promise<BackupData> {
    return api.get('/api/backup/export');
  },

  async import(backup: BackupData): Promise<{ success: boolean; message?: string }> {
    return api.post('/api/backup/import', backup);
  },

  // Download export with options (supports CSV, selective export, encryption)
  async downloadExport(options: ExportOptions = { format: 'json', scope: 'all' }): Promise<void> {
    const response = await fetch('/api/backup/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const contentType = response.headers.get('Content-Type') || '';
    const isCSV = contentType.includes('text/csv');

    const blob = await response.blob();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = isCSV
      ? `budget-transactions-${dateStr}.csv`
      : `budget-backup-${dateStr}.json`;

    // Download file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Legacy download (backward compatible)
  async downloadExportLegacy(): Promise<void> {
    const backup = await this.export();
    const filename = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import with options (supports merge mode, encrypted backups)
  async importFromFile(file: File, options: ImportOptions = { mode: 'replace' }): Promise<ImportResult> {
    try {
      const text = await file.text();
      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        return {
          success: false,
          mode: options.mode,
          summary: this.createEmptySummary(),
          errors: [{ entity: 'file', id: 'parse', message: 'Invalid JSON format' }],
        };
      }

      return api.post('/api/backup/import', { data, options });
    } catch (err) {
      return {
        success: false,
        mode: options.mode,
        summary: this.createEmptySummary(),
        errors: [{ entity: 'file', id: 'read', message: err instanceof Error ? err.message : 'Failed to read backup file' }],
      };
    }
  },

  // Check if backup is encrypted (for UI to know if password prompt needed)
  isEncrypted(data: unknown): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'encrypted' in data &&
      (data as { encrypted: boolean }).encrypted === true
    );
  },

  // Parse file to check if encrypted (without importing)
  async checkFile(file: File): Promise<{ valid: boolean; encrypted: boolean; error?: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (this.isEncrypted(data)) {
        return { valid: true, encrypted: true };
      }

      // Basic structure validation for unencrypted backup
      if (!data.version || !data.data) {
        return { valid: false, encrypted: false, error: 'Invalid backup file structure' };
      }

      return { valid: true, encrypted: false };
    } catch {
      return { valid: false, encrypted: false, error: 'Invalid JSON file' };
    }
  },

  createEmptySummary(): ImportResult['summary'] {
    return {
      accountsAdded: 0,
      accountsSkipped: 0,
      categoriesAdded: 0,
      categoriesSkipped: 0,
      transactionsAdded: 0,
      transactionsSkipped: 0,
      billsAdded: 0,
      billsSkipped: 0,
      goalsAdded: 0,
      goalsSkipped: 0,
      budgetsAdded: 0,
      budgetsSkipped: 0,
      patternsAdded: 0,
      patternsSkipped: 0,
      contributionsAdded: 0,
      contributionsSkipped: 0,
    };
  },
};
