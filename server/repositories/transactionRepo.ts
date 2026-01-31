import { db, generateId, now } from '../db/database';
import type { Transaction } from '../types';

export const transactionRepo = {
  getAll(limit = 100): Transaction[] {
    return db.prepare('SELECT * FROM transactions ORDER BY date DESC LIMIT ?').all(limit) as Transaction[];
  },

  getByDateRange(startDate: number, endDate: number): Transaction[] {
    return db.prepare(
      'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC'
    ).all(startDate, endDate) as Transaction[];
  },

  create(data: {
    account_id: string;
    category_id?: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    date: number;
    description?: string;
    notes?: string;
  }): Transaction {
    const id = generateId();
    const timestamp = now();

    const insertTransaction = db.transaction(() => {
      db.prepare(
        `INSERT INTO transactions (id, account_id, category_id, amount, type, date, description, notes, is_recurring, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      ).run(
        id,
        data.account_id,
        data.category_id || null,
        data.amount,
        data.type,
        data.date,
        data.description || null,
        data.notes || null,
        timestamp,
        timestamp
      );

      // Update account balance
      const multiplier = data.type === 'income' ? 1 : -1;
      db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(
        data.amount * multiplier,
        timestamp,
        data.account_id
      );
    });

    insertTransaction();

    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
  },

  delete(id: string): void {
    const deleteTransaction = db.transaction(() => {
      const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;

      if (tx) {
        // Reverse the balance change
        const multiplier = tx.type === 'income' ? -1 : 1;
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(
          tx.amount * multiplier,
          now(),
          tx.account_id
        );
      }

      db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    });

    deleteTransaction();
  },

  getMonthlyTotals(year: number, month: number): { income: number; expenses: number } {
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59).getTime();

    const incomeResult = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date <= ?`
    ).get(startDate, endDate) as { total: number };

    const expenseResult = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?`
    ).get(startDate, endDate) as { total: number };

    return {
      income: incomeResult?.total || 0,
      expenses: expenseResult?.total || 0,
    };
  },
};
