import { db, generateId, now } from '../db/database';
import type { Budget } from '../types';

export const budgetRepo = {
  getAll(): Budget[] {
    return db.prepare('SELECT * FROM budgets ORDER BY created_at DESC').all() as Budget[];
  },

  getById(id: string): Budget | null {
    return db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget | null;
  },

  getByCategory(categoryId: string): Budget | null {
    return db.prepare(
      'SELECT * FROM budgets WHERE category_id = ? AND (end_date IS NULL OR end_date >= ?)'
    ).get(categoryId, now()) as Budget | null;
  },

  create(data: {
    category_id: string;
    amount: number;
    period: 'weekly' | 'monthly' | 'yearly';
    start_date?: number;
    end_date?: number;
  }): Budget {
    const id = generateId();
    const timestamp = now();

    db.prepare(
      `INSERT INTO budgets (id, category_id, amount, period, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.category_id,
      data.amount,
      data.period,
      data.start_date || timestamp,
      data.end_date || null,
      timestamp,
      timestamp
    );

    return this.getById(id)!;
  },

  update(id: string, data: Partial<Budget>): Budget {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.amount !== undefined) { updates.push('amount = ?'); values.push(data.amount); }
    if (data.period !== undefined) { updates.push('period = ?'); values.push(data.period); }
    if (data.end_date !== undefined) { updates.push('end_date = ?'); values.push(data.end_date); }

    updates.push('updated_at = ?');
    values.push(now());
    values.push(id);

    db.prepare(`UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id)!;
  },

  delete(id: string): void {
    db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
  },
};
