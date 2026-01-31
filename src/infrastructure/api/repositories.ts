import { api } from './client';

// Types - same as before
export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  currency: string;
  is_active: boolean;
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
  is_recurring: boolean;
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
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  type: 'income' | 'expense';
  next_due_date: number;
  reminder_days: number;
  is_active: boolean;
  is_paid: boolean;
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

// Account Repository
export const accountRepo = {
  async getAll(): Promise<Account[]> {
    return api.get('/api/accounts');
  },

  async getById(id: string): Promise<Account | null> {
    try {
      return await api.get(`/api/accounts/${id}`);
    } catch {
      return null;
    }
  },

  async create(data: { name: string; type: Account['type']; balance?: number; currency?: string }): Promise<Account> {
    return api.post('/api/accounts', data);
  },

  async update(id: string, data: Partial<Account>): Promise<Account> {
    return api.patch(`/api/accounts/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/accounts/${id}`);
  },
};

// Category Repository
export const categoryRepo = {
  async getAll(): Promise<Category[]> {
    return api.get('/api/categories');
  },

  async getByType(type: 'income' | 'expense'): Promise<Category[]> {
    return api.get(`/api/categories?type=${type}`);
  },

  async create(data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }): Promise<Category> {
    return api.post('/api/categories', data);
  },
};

// Transaction Repository
export const transactionRepo = {
  async getAll(limit = 100): Promise<Transaction[]> {
    return api.get(`/api/transactions?limit=${limit}`);
  },

  async getByDateRange(startDate: number, endDate: number): Promise<Transaction[]> {
    return api.get(`/api/transactions?startDate=${startDate}&endDate=${endDate}`);
  },

  async create(data: {
    account_id: string;
    category_id?: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    date: number;
    description?: string;
    notes?: string;
  }): Promise<Transaction> {
    return api.post('/api/transactions', data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/transactions/${id}`);
  },

  async getMonthlyTotals(year: number, month: number): Promise<{ income: number; expenses: number }> {
    return api.get(`/api/transactions/monthly-totals?year=${year}&month=${month}`);
  },
};

// Bill Repository
export const billRepo = {
  async getAll(): Promise<Bill[]> {
    return api.get('/api/bills');
  },

  async getUpcoming(days = 30): Promise<Bill[]> {
    return api.get(`/api/bills/upcoming?days=${days}`);
  },

  async create(data: {
    name: string;
    amount: number;
    due_day: number;
    frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
    type?: 'income' | 'expense';
    category_id?: string;
    account_id?: string;
    reminder_days?: number;
  }): Promise<Bill> {
    return api.post('/api/bills', data);
  },

  async markPaid(id: string, createTransaction = true): Promise<void> {
    await api.post(`/api/bills/${id}/mark-paid`, { createTransaction });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/bills/${id}`);
  },
};

// Goal Repository
export const goalRepo = {
  async getAll(): Promise<Goal[]> {
    return api.get('/api/goals');
  },

  async getById(id: string): Promise<Goal | null> {
    try {
      return await api.get(`/api/goals/${id}`);
    } catch {
      return null;
    }
  },

  async getActive(): Promise<Goal[]> {
    return api.get('/api/goals?status=active');
  },

  async create(data: {
    name: string;
    target_amount: number;
    description?: string;
    deadline?: number;
    priority?: number;
    icon?: string;
    color?: string;
  }): Promise<Goal> {
    return api.post('/api/goals', data);
  },

  async update(id: string, data: Partial<Goal>): Promise<Goal> {
    return api.patch(`/api/goals/${id}`, data);
  },

  async addContribution(
    goalId: string,
    amount: number,
    source: 'manual' | 'automatic' | 'adjustment',
    notes?: string
  ): Promise<void> {
    await api.post(`/api/goals/${goalId}/contributions`, { amount, source, notes });
  },

  async getContributions(goalId: string): Promise<GoalContribution[]> {
    return api.get(`/api/goals/${goalId}/contributions`);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/goals/${id}`);
  },
};

// Budget Repository
export const budgetRepo = {
  async getAll(): Promise<Budget[]> {
    return api.get('/api/budgets');
  },

  async getById(id: string): Promise<Budget | null> {
    try {
      return await api.get(`/api/budgets/${id}`);
    } catch {
      return null;
    }
  },

  async create(data: {
    category_id: string;
    amount: number;
    period: 'weekly' | 'monthly' | 'yearly';
    start_date?: number;
    end_date?: number;
  }): Promise<Budget> {
    return api.post('/api/budgets', data);
  },

  async update(id: string, data: Partial<Budget>): Promise<Budget> {
    return api.patch(`/api/budgets/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/budgets/${id}`);
  },
};
