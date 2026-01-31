import { db, generateId, now } from '../db/database';
import type { Account } from '../types';

export const accountRepo = {
  getAll(): Account[] {
    return db.prepare('SELECT * FROM accounts WHERE is_active = 1 ORDER BY name').all() as Account[];
  },

  getById(id: string): Account | null {
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | null;
  },

  create(data: { name: string; type: Account['type']; balance?: number; currency?: string }): Account {
    const id = generateId();
    const timestamp = now();

    db.prepare(
      `INSERT INTO accounts (id, name, type, balance, currency, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(id, data.name, data.type, data.balance || 0, data.currency || 'USD', timestamp, timestamp);

    return this.getById(id)!;
  },

  update(id: string, data: Partial<Account>): Account {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.type !== undefined) { updates.push('type = ?'); values.push(data.type); }
    if (data.balance !== undefined) { updates.push('balance = ?'); values.push(data.balance); }

    updates.push('updated_at = ?');
    values.push(now());
    values.push(id);

    db.prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id)!;
  },

  delete(id: string): void {
    db.prepare('UPDATE accounts SET is_active = 0, updated_at = ? WHERE id = ?').run(now(), id);
  },
};
