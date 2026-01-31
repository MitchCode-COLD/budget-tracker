import { db } from './database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations() {
  console.log('Running database migrations...');

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    )
  `);

  // Check if schema has been applied
  const applied = db.prepare('SELECT name FROM _migrations WHERE name = ?').get('001_schema');

  if (!applied) {
    console.log('Applying schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Insert default categories
    const timestamp = Date.now();
    const defaultCategories = [
      ['cat-income-salary', 'Salary', 'income', '💰', '#22c55e'],
      ['cat-income-freelance', 'Freelance', 'income', '💼', '#16a34a'],
      ['cat-income-investments', 'Investments', 'income', '📈', '#15803d'],
      ['cat-income-other', 'Other Income', 'income', '💵', '#14532d'],
      ['cat-expense-housing', 'Housing', 'expense', '🏠', '#ef4444'],
      ['cat-expense-utilities', 'Utilities', 'expense', '💡', '#f97316'],
      ['cat-expense-groceries', 'Groceries', 'expense', '🛒', '#eab308'],
      ['cat-expense-transportation', 'Transportation', 'expense', '🚗', '#84cc16'],
      ['cat-expense-entertainment', 'Entertainment', 'expense', '🎬', '#06b6d4'],
      ['cat-expense-dining', 'Dining Out', 'expense', '🍽️', '#8b5cf6'],
      ['cat-expense-shopping', 'Shopping', 'expense', '🛍️', '#ec4899'],
      ['cat-expense-health', 'Health', 'expense', '🏥', '#f43f5e'],
      ['cat-expense-subscriptions', 'Subscriptions', 'expense', '📱', '#6366f1'],
      ['cat-expense-other', 'Other Expenses', 'expense', '📦', '#64748b'],
    ];

    const insertCategory = db.prepare(
      'INSERT OR IGNORE INTO categories (id, name, type, icon, color, parent_id, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)'
    );

    for (const cat of defaultCategories) {
      insertCategory.run(...cat, timestamp);
    }

    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run('001_schema', timestamp);
    console.log('Schema applied successfully');
  } else {
    console.log('Schema already applied');
  }
}
