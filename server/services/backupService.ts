import { db } from '../db/database';
import type { BackupData, Account, Category, Transaction, Bill, Goal, GoalContribution, Budget, RecurringPattern } from '../types';

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
};
