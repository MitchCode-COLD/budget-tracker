import crypto from 'crypto';
import { db } from '../db/database';
import type {
  BackupData,
  Account,
  Category,
  Transaction,
  Bill,
  Goal,
  GoalContribution,
  Budget,
  RecurringPattern,
  ExportOptions,
  ImportOptions,
  ImportResult,
  ImportError,
  EncryptedBackupData,
} from '../types';

function formatDate(timestamp: number, dateFormat: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (dateFormat) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default: // MM/DD/YYYY
      return `${month}/${day}/${year}`;
  }
}

function escapeCSV(val: string | null | undefined): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function createEmptySummary(): ImportResult['summary'] {
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
}

export const backupService = {
  export(): BackupData {
    const accounts = db.prepare('SELECT * FROM accounts').all() as Account[];
    const categories = db.prepare('SELECT * FROM categories').all() as Category[];
    const transactions = db.prepare('SELECT * FROM transactions').all() as Transaction[];
    const bills = db.prepare('SELECT * FROM bills').all() as Bill[];
    const goals = db.prepare('SELECT * FROM goals').all() as Goal[];
    const goalContributions = db.prepare('SELECT * FROM goal_contributions').all() as GoalContribution[];
    const budgets = db.prepare('SELECT * FROM budgets').all() as Budget[];
    const recurringPatterns = db.prepare('SELECT * FROM recurring_patterns').all() as RecurringPattern[];

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        accounts,
        categories,
        transactions,
        bills,
        goals,
        goalContributions,
        budgets,
        recurringPatterns,
      },
      metadata: {
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
        totalGoals: goals.length,
        totalBills: bills.length,
      },
    };
  },

  exportCSV(options: { startDate?: number; endDate?: number; dateFormat?: string }): string {
    const dateFormat = options.dateFormat || 'MM/DD/YYYY';

    // Get transactions with optional date filtering
    let transactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all() as Transaction[];

    if (options.startDate && options.endDate) {
      transactions = transactions.filter(
        (t) => t.date >= options.startDate! && t.date <= options.endDate!
      );
    }

    // Get lookup maps for account and category names
    const accounts = db.prepare('SELECT * FROM accounts').all() as Account[];
    const categories = db.prepare('SELECT * FROM categories').all() as Category[];

    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // Build CSV content
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Account', 'Category', 'Notes'];
    const rows = transactions.map((t) =>
      [
        formatDate(t.date, dateFormat),
        escapeCSV(t.description),
        t.amount.toFixed(2),
        t.type,
        escapeCSV(accountMap.get(t.account_id) || 'Unknown'),
        escapeCSV(t.category_id ? categoryMap.get(t.category_id) || '' : ''),
        escapeCSV(t.notes),
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  },

  exportSelective(options: ExportOptions): BackupData {
    const fullBackup = this.export();

    if (options.scope === 'all') {
      // Apply date filter to transactions if specified
      if (options.dateRange) {
        fullBackup.data.transactions = fullBackup.data.transactions.filter(
          (t) => t.date >= options.dateRange!.startDate && t.date <= options.dateRange!.endDate
        );
        fullBackup.metadata.totalTransactions = fullBackup.data.transactions.length;
      }
      return fullBackup;
    }

    // Selective export - create partial backup
    const partialData: BackupData['data'] = {
      accounts: [],
      categories: [],
      transactions: [],
      bills: [],
      goals: [],
      goalContributions: [],
      budgets: [],
      recurringPatterns: [],
    };

    if (options.scope === 'transactions') {
      let transactions = fullBackup.data.transactions;
      if (options.dateRange) {
        transactions = transactions.filter(
          (t) => t.date >= options.dateRange!.startDate && t.date <= options.dateRange!.endDate
        );
      }
      partialData.transactions = transactions;
    } else if (options.scope === 'accounts') {
      partialData.accounts = fullBackup.data.accounts;
    } else if (options.scope === 'categories') {
      partialData.categories = fullBackup.data.categories;
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: partialData,
      metadata: {
        totalAccounts: partialData.accounts.length,
        totalTransactions: partialData.transactions.length,
        totalGoals: partialData.goals.length,
        totalBills: partialData.bills.length,
      },
    };
  },

  encryptBackup(backup: BackupData, password: string): EncryptedBackupData {
    // Generate cryptographic salt and IV
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    // Derive key from password using PBKDF2
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    // Encrypt the backup data
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const jsonData = JSON.stringify(backup);

    let encrypted = cipher.update(jsonData, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      version: 1,
      encrypted: true,
      algorithm: 'aes-256-gcm',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted,
    };
  },

  decryptBackup(encryptedData: EncryptedBackupData, password: string): BackupData {
    // Decode the stored values
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    // Derive the same key from password
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as BackupData;
  },

  isEncryptedBackup(data: unknown): data is EncryptedBackupData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'encrypted' in data &&
      (data as EncryptedBackupData).encrypted === true
    );
  },

  validateBackupStructure(backup: BackupData): ImportError[] {
    const errors: ImportError[] = [];

    // Version check
    if (backup.version !== 1) {
      errors.push({
        entity: 'backup',
        id: 'version',
        message: `Unsupported backup version: ${backup.version}`,
      });
    }

    // Required arrays
    const requiredKeys = [
      'accounts',
      'categories',
      'transactions',
      'bills',
      'goals',
      'goalContributions',
      'budgets',
      'recurringPatterns',
    ];

    for (const key of requiredKeys) {
      const value = backup.data?.[key as keyof typeof backup.data];
      if (!Array.isArray(value)) {
        errors.push({
          entity: 'backup',
          id: key,
          message: `Missing or invalid array: ${key}`,
        });
      }
    }

    if (errors.length > 0) return errors;

    // Validate individual records
    for (const tx of backup.data.transactions || []) {
      if (!tx.id) {
        errors.push({ entity: 'transaction', id: 'unknown', field: 'id', message: 'Transaction missing ID' });
      }
      if (!tx.account_id) {
        errors.push({ entity: 'transaction', id: tx.id || 'unknown', field: 'account_id', message: 'Transaction missing account_id' });
      }
      if (typeof tx.amount !== 'number') {
        errors.push({ entity: 'transaction', id: tx.id || 'unknown', field: 'amount', message: 'Invalid amount' });
      }
    }

    for (const acc of backup.data.accounts || []) {
      if (!acc.id) {
        errors.push({ entity: 'account', id: 'unknown', field: 'id', message: 'Account missing ID' });
      }
      if (!acc.name) {
        errors.push({ entity: 'account', id: acc.id || 'unknown', field: 'name', message: 'Account missing name' });
      }
    }

    for (const cat of backup.data.categories || []) {
      if (!cat.id) {
        errors.push({ entity: 'category', id: 'unknown', field: 'id', message: 'Category missing ID' });
      }
      if (!cat.name) {
        errors.push({ entity: 'category', id: cat.id || 'unknown', field: 'name', message: 'Category missing name' });
      }
    }

    return errors;
  },

  import(backup: BackupData): { success: boolean; error?: string } {
    // Validate version
    if (backup.version !== 1) {
      return { success: false, error: 'Unsupported backup version' };
    }

    // Validate structure
    const requiredKeys = ['accounts', 'categories', 'transactions', 'bills', 'goals', 'goalContributions', 'budgets', 'recurringPatterns'];
    for (const key of requiredKeys) {
      if (!Array.isArray(backup.data[key as keyof typeof backup.data])) {
        return { success: false, error: `Missing or invalid: ${key}` };
      }
    }

    // Atomic restore using transaction
    const restore = db.transaction(() => {
      // Clear all tables (order matters due to FK constraints)
      db.prepare('DELETE FROM goal_contributions').run();
      db.prepare('DELETE FROM goals').run();
      db.prepare('DELETE FROM budgets').run();
      db.prepare('DELETE FROM bills').run();
      db.prepare('DELETE FROM transactions').run();
      db.prepare('DELETE FROM recurring_patterns').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM accounts').run();

      // Insert categories
      const insertCategory = db.prepare(
        `INSERT INTO categories (id, name, type, icon, color, parent_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const cat of backup.data.categories) {
        insertCategory.run(cat.id, cat.name, cat.type, cat.icon, cat.color, cat.parent_id, cat.created_at);
      }

      // Insert accounts
      const insertAccount = db.prepare(
        `INSERT INTO accounts (id, name, type, balance, currency, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const acc of backup.data.accounts) {
        insertAccount.run(acc.id, acc.name, acc.type, acc.balance, acc.currency, acc.is_active, acc.created_at, acc.updated_at);
      }

      // Insert recurring patterns
      const insertPattern = db.prepare(
        `INSERT INTO recurring_patterns (id, frequency, interval, day_of_week, day_of_month, month_of_year, start_date, end_date, last_processed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const pat of backup.data.recurringPatterns) {
        insertPattern.run(pat.id, pat.frequency, pat.interval, pat.day_of_week, pat.day_of_month, pat.month_of_year, pat.start_date, pat.end_date, pat.last_processed, pat.created_at);
      }

      // Insert transactions
      const insertTransaction = db.prepare(
        `INSERT INTO transactions (id, account_id, category_id, amount, type, date, description, notes, is_recurring, recurring_pattern_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const tx of backup.data.transactions) {
        insertTransaction.run(tx.id, tx.account_id, tx.category_id, tx.amount, tx.type, tx.date, tx.description, tx.notes, tx.is_recurring, tx.recurring_pattern_id, tx.created_at, tx.updated_at);
      }

      // Insert bills
      const insertBill = db.prepare(
        `INSERT INTO bills (id, name, category_id, account_id, amount, due_day, frequency, type, next_due_date, reminder_days, is_active, is_paid, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const bill of backup.data.bills) {
        insertBill.run(bill.id, bill.name, bill.category_id, bill.account_id, bill.amount, bill.due_day, bill.frequency, bill.type, bill.next_due_date, bill.reminder_days, bill.is_active, bill.is_paid, bill.created_at, bill.updated_at);
      }

      // Insert budgets
      const insertBudget = db.prepare(
        `INSERT INTO budgets (id, category_id, amount, period, start_date, end_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const budget of backup.data.budgets) {
        insertBudget.run(budget.id, budget.category_id, budget.amount, budget.period, budget.start_date, budget.end_date, budget.created_at, budget.updated_at);
      }

      // Insert goals
      const insertGoal = db.prepare(
        `INSERT INTO goals (id, name, description, target_amount, current_amount, deadline, priority, icon, color, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const goal of backup.data.goals) {
        insertGoal.run(goal.id, goal.name, goal.description, goal.target_amount, goal.current_amount, goal.deadline, goal.priority, goal.icon, goal.color, goal.status, goal.created_at, goal.updated_at);
      }

      // Insert goal contributions
      const insertContribution = db.prepare(
        `INSERT INTO goal_contributions (id, goal_id, amount, source, notes, date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const contrib of backup.data.goalContributions) {
        insertContribution.run(contrib.id, contrib.goal_id, contrib.amount, contrib.source, contrib.notes, contrib.date, contrib.created_at);
      }
    });

    try {
      restore();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  importMerge(backup: BackupData): ImportResult {
    const result: ImportResult = {
      success: true,
      mode: 'merge',
      summary: createEmptySummary(),
      errors: [],
    };

    const exists = (table: string, id: string) => {
      const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
      return row !== undefined;
    };

    const mergeTransaction = db.transaction(() => {
      // Merge categories first (dependencies)
      for (const cat of backup.data.categories) {
        if (exists('categories', cat.id)) {
          result.summary.categoriesSkipped++;
          continue;
        }
        try {
          db.prepare(
            `INSERT INTO categories (id, name, type, icon, color, parent_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).run(cat.id, cat.name, cat.type, cat.icon, cat.color, cat.parent_id, cat.created_at);
          result.summary.categoriesAdded++;
        } catch (err) {
          result.errors.push({
            entity: 'category',
            id: cat.id,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Merge accounts
      for (const acc of backup.data.accounts) {
        if (exists('accounts', acc.id)) {
          result.summary.accountsSkipped++;
          continue;
        }
        try {
          db.prepare(
            `INSERT INTO accounts (id, name, type, balance, currency, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(acc.id, acc.name, acc.type, acc.balance, acc.currency, acc.is_active, acc.created_at, acc.updated_at);
          result.summary.accountsAdded++;
        } catch (err) {
          result.errors.push({
            entity: 'account',
            id: acc.id,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Merge recurring patterns
      for (const pat of backup.data.recurringPatterns) {
        if (exists('recurring_patterns', pat.id)) {
          result.summary.patternsSkipped++;
          continue;
        }
        try {
          db.prepare(
            `INSERT INTO recurring_patterns (id, frequency, interval, day_of_week, day_of_month, month_of_year, start_date, end_date, last_processed, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(pat.id, pat.frequency, pat.interval, pat.day_of_week, pat.day_of_month, pat.month_of_year, pat.start_date, pat.end_date, pat.last_processed, pat.created_at);
          result.summary.patternsAdded++;
        } catch (err) {
          result.errors.push({
            entity: 'pattern',
            id: pat.id,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Merge transactions
      for (const tx of backup.data.transactions) {
        if (exists('transactions', tx.id)) {
          result.summary.transactionsSkipped++;
          continue;
        }
        // Validate foreign keys
        if (!exists('accounts', tx.account_id)) {
          result.errors.push({
            entity: 'transaction',
            id: tx.id,
            field: 'account_id',
            message: `Referenced account ${tx.account_id} does not exist`,
          });
          continue;
        }
        try {
          db.prepare(
            `INSERT INTO transactions (id, account_id, category_id, amount, type, date, description, notes, is_recurring, recurring_pattern_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(tx.id, tx.account_id, tx.category_id, tx.amount, tx.type, tx.date, tx.description, tx.notes, tx.is_recurring, tx.recurring_pattern_id, tx.created_at, tx.updated_at);
          result.summary.transactionsAdded++;
        } catch (err) {
          result.errors.push({
            entity: 'transaction',
            id: tx.id,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Merge bills
      for (const bill of backup.data.bills) {
        if (exists('bills', bill.id)) {
          result.summary.billsSkipped++;
          continue;
        }
        try {
          db.prepare(
            `INSERT INTO bills (id, name, category_id, account_id, amount, due_day, frequency, type, next_due_date, reminder_days, is_active, is_paid, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(bill.id, bill.name, bill.category_id, bill.account_id, bill.amount, bill.due_day, bill.frequency, bill.type, bill.next_due_date, bill.reminder_days, bill.is_active, bill.is_paid, bill.created_at, bill.updated_at);
          result.summary.billsAdded++;
        } catch (err) {
          result.errors.push({
            entity: 'bill',
            id: bill.id,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Merge budgets
      for (const budget of backup.data.budgets) {
        if (exists('budgets', budget.id)) {
          result.summary.budgetsSkipped++;
          continue;
        }
        try {
          db.prepare(
            `INSERT INTO budgets (id, category_id, amount, period, start_date, end_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(budget.id, budget.category_id, budget.amount, budget.period, budget.start_date, budget.end_date, budget.created_at, budget.updated_at);
          result.summary.budgetsAdded++;
        } catch (err) {
          result.errors.push({
            entity: 'budget',
            id: budget.id,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Merge goals
      for (const goal of backup.data.goals) {
        if (exists('goals', goal.id)) {
          result.summary.goalsSkipped++;
          continue;
        }
        try {
          db.prepare(
            `INSERT INTO goals (id, name, description, target_amount, current_amount, deadline, priority, icon, color, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(goal.id, goal.name, goal.description, goal.target_amount, goal.current_amount, goal.deadline, goal.priority, goal.icon, goal.color, goal.status, goal.created_at, goal.updated_at);
          result.summary.goalsAdded++;
        } catch (err) {
          result.errors.push({
            entity: 'goal',
            id: goal.id,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Merge goal contributions
      for (const contrib of backup.data.goalContributions) {
        if (exists('goal_contributions', contrib.id)) {
          result.summary.contributionsSkipped++;
          continue;
        }
        // Validate goal exists
        if (!exists('goals', contrib.goal_id)) {
          result.errors.push({
            entity: 'contribution',
            id: contrib.id,
            field: 'goal_id',
            message: `Referenced goal ${contrib.goal_id} does not exist`,
          });
          continue;
        }
        try {
          db.prepare(
            `INSERT INTO goal_contributions (id, goal_id, amount, source, notes, date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).run(contrib.id, contrib.goal_id, contrib.amount, contrib.source, contrib.notes, contrib.date, contrib.created_at);
          result.summary.contributionsAdded++;
        } catch (err) {
          result.errors.push({
            entity: 'contribution',
            id: contrib.id,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    });

    try {
      mergeTransaction();
    } catch (err) {
      result.success = false;
      result.errors.push({
        entity: 'backup',
        id: 'global',
        message: err instanceof Error ? err.message : 'Transaction failed',
      });
    }

    return result;
  },

  importWithOptions(data: unknown, options: ImportOptions): ImportResult {
    let backup: BackupData;

    // Handle encrypted backup
    if (this.isEncryptedBackup(data)) {
      if (!options.password) {
        return {
          success: false,
          mode: options.mode,
          summary: createEmptySummary(),
          errors: [{ entity: 'backup', id: 'global', message: 'Password required for encrypted backup' }],
        };
      }
      try {
        backup = this.decryptBackup(data, options.password);
      } catch {
        return {
          success: false,
          mode: options.mode,
          summary: createEmptySummary(),
          errors: [{ entity: 'backup', id: 'global', message: 'Decryption failed - incorrect password or corrupted file' }],
        };
      }
    } else {
      backup = data as BackupData;
    }

    // Validate backup structure
    const validationErrors = this.validateBackupStructure(backup);
    if (validationErrors.length > 0) {
      return {
        success: false,
        mode: options.mode,
        summary: createEmptySummary(),
        errors: validationErrors,
      };
    }

    // Perform import based on mode
    if (options.mode === 'merge') {
      return this.importMerge(backup);
    } else {
      // Replace mode with detailed result
      const existingResult = this.import(backup);
      return {
        success: existingResult.success,
        mode: 'replace',
        summary: {
          accountsAdded: backup.data.accounts.length,
          accountsSkipped: 0,
          categoriesAdded: backup.data.categories.length,
          categoriesSkipped: 0,
          transactionsAdded: backup.data.transactions.length,
          transactionsSkipped: 0,
          billsAdded: backup.data.bills.length,
          billsSkipped: 0,
          goalsAdded: backup.data.goals.length,
          goalsSkipped: 0,
          budgetsAdded: backup.data.budgets.length,
          budgetsSkipped: 0,
          patternsAdded: backup.data.recurringPatterns.length,
          patternsSkipped: 0,
          contributionsAdded: backup.data.goalContributions.length,
          contributionsSkipped: 0,
        },
        errors: existingResult.error ? [{ entity: 'backup', id: 'global', message: existingResult.error }] : [],
      };
    }
  },
};
