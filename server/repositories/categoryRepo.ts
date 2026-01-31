import { db, generateId, now } from '../db/database';
import type { Category } from '../types';

export const categoryRepo = {
  getAll(): Category[] {
    return db.prepare('SELECT * FROM categories ORDER BY type, name').all() as Category[];
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
};
