import { db, generateId, now } from '../db/database';
import type { Category } from '../types';

export const categoryRepo = {
  getAll(): Category[] {
    return db.prepare('SELECT * FROM categories ORDER BY type, name').all() as Category[];
  },

  getById(id: string): Category | undefined {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
  },

  getByType(type: 'income' | 'expense'): Category[] {
    return db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY name').all(type) as Category[];
  },

  create(data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }): Category {
    const id = generateId();

    db.prepare(
      `INSERT INTO categories (id, name, type, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.name, data.type, data.icon || null, data.color || null, now());

    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;
  },

  update(id: string, data: { name?: string; icon?: string; color?: string }): Category | undefined {
    const category = this.getById(id);
    if (!category) return undefined;

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      values.push(data.icon || null);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color || null);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getById(id);
  },

  delete(id: string): { success: boolean; error?: string } {
    // Check if category is used by any transactions
    const transactionCount = db.prepare(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?'
    ).get(id) as { count: number };

    if (transactionCount.count > 0) {
      return { success: false, error: `Category is used by ${transactionCount.count} transaction(s)` };
    }

    // Check if category is used by any bills
    const billCount = db.prepare(
      'SELECT COUNT(*) as count FROM bills WHERE category_id = ?'
    ).get(id) as { count: number };

    if (billCount.count > 0) {
      return { success: false, error: `Category is used by ${billCount.count} bill(s)` };
    }

    // Check if category is used by any budgets
    const budgetCount = db.prepare(
      'SELECT COUNT(*) as count FROM budgets WHERE category_id = ?'
    ).get(id) as { count: number };

    if (budgetCount.count > 0) {
      return { success: false, error: `Category is used by ${budgetCount.count} budget(s)` };
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return { success: true };
  },
};
