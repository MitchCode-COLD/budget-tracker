import { db } from './database';

const SCHEMA = `
-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'cash', 'investment')),
    balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Categories table (supports hierarchy with parent_id)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT,
    color TEXT,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL
);

-- Recurring patterns for transactions and bills
CREATE TABLE IF NOT EXISTS recurring_patterns (
    id TEXT PRIMARY KEY NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    interval INTEGER NOT NULL DEFAULT 1,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    month_of_year INTEGER CHECK (month_of_year >= 1 AND month_of_year <= 12),
    start_date INTEGER NOT NULL,
    end_date INTEGER,
    last_processed INTEGER,
    created_at INTEGER NOT NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    date INTEGER NOT NULL,
    description TEXT,
    notes TEXT,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurring_pattern_id TEXT REFERENCES recurring_patterns(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
    start_date INTEGER NOT NULL,
    end_date INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
    type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
    next_due_date INTEGER NOT NULL,
    reminder_days INTEGER NOT NULL DEFAULT 3,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_paid INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Goals table for savings targets
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    target_amount REAL NOT NULL,
    current_amount REAL NOT NULL DEFAULT 0,
    deadline INTEGER,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    icon TEXT DEFAULT '🎯',
    color TEXT DEFAULT '#3b82f6',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Goal contributions tracking
CREATE TABLE IF NOT EXISTS goal_contributions (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    source TEXT CHECK (source IN ('manual', 'automatic', 'adjustment')),
    notes TEXT,
    date INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_bills_next_due_date ON bills(next_due_date);
CREATE INDEX IF NOT EXISTS idx_bills_type ON bills(type);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_date ON goal_contributions(date);
`;

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
    db.exec(SCHEMA);

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
