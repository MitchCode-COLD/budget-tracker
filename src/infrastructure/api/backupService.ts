import { api } from './client';

export interface BackupData {
  version: number;
  exportedAt: string;
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

export const backupService = {
  async export(): Promise<BackupData> {
    return api.get('/api/backup/export');
  },

  async import(backup: BackupData): Promise<{ success: boolean; message?: string }> {
    return api.post('/api/backup/import', backup);
  },

  async downloadExport(): Promise<void> {
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

  async importFromFile(file: File): Promise<{ success: boolean; error?: string }> {
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as BackupData;

      // Validate backup structure
      if (!backup.version || !backup.data) {
        return { success: false, error: 'Invalid backup file format' };
      }

      const result = await this.import(backup);
      return { success: result.success, error: result.success ? undefined : 'Import failed' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to read backup file' };
    }
  },
};
