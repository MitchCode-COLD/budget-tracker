export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  currency: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  created_at: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date: number;
  description: string | null;
  notes: string | null;
  is_recurring: number;
  recurring_pattern_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface Bill {
  id: string;
  name: string;
  category_id: string | null;
  account_id: string | null;
  amount: number;
  due_day: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  type: 'income' | 'expense';
  next_due_date: number;
  reminder_days: number;
  is_active: number;
  is_paid: number;
  created_at: number;
  updated_at: number;
}

export interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: number;
  end_date: number | null;
  created_at: number;
  updated_at: number;
}

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  deadline: number | null;
  priority: number;
  icon: string;
  color: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  created_at: number;
  updated_at: number;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  amount: number;
  source: 'manual' | 'automatic' | 'adjustment';
  notes: string | null;
  date: number;
  created_at: number;
}

export interface RecurringPattern {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  start_date: number;
  end_date: number | null;
  last_processed: number | null;
  created_at: number;
}

// Backup types
export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    bills: Bill[];
    goals: Goal[];
    goalContributions: GoalContribution[];
    budgets: Budget[];
    recurringPatterns: RecurringPattern[];
  };
  metadata: {
    totalAccounts: number;
    totalTransactions: number;
    totalGoals: number;
    totalBills: number;
  };
}
