import { api } from './client';
import type { Transaction, Bill } from './repositories';

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  upcomingBillsTotal: number;
  upcomingBillsCount: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  total: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  monthNum: number;
  income: number;
  expenses: number;
  net: number;
  projectedExpenses: number;
}

export interface BudgetProgress {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface SpendingPrediction {
  category: string;
  currentSpent: number;
  projectedMonthly: number;
  dailyAverage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    return api.get('/api/dashboard/stats');
  },

  async getCategorySpending(months = 1): Promise<CategorySpending[]> {
    return api.get(`/api/dashboard/category-spending?months=${months}`);
  },

  async getMonthlyTrends(months = 6): Promise<MonthlyTrend[]> {
    return api.get(`/api/dashboard/monthly-trends?months=${months}`);
  },

  async getBudgetProgress(): Promise<BudgetProgress[]> {
    return api.get('/api/dashboard/budget-progress');
  },

  async getSpendingPredictions(): Promise<SpendingPrediction[]> {
    return api.get('/api/dashboard/spending-predictions');
  },

  async getRecentTransactions(limit = 5): Promise<Transaction[]> {
    return api.get(`/api/dashboard/recent-transactions?limit=${limit}`);
  },

  async getUpcomingBills(limit = 5): Promise<Bill[]> {
    return api.get(`/api/dashboard/upcoming-bills?limit=${limit}`);
  },
};
