import { db } from '../db/database';
import type { Transaction, Bill } from '../types';

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
  getStats(): DashboardStats {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    const next30Days = Date.now() + 30 * 24 * 60 * 60 * 1000;

    // Total balance across all accounts
    const balanceResult = db.prepare(
      `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN -balance ELSE balance END), 0) as total
       FROM accounts WHERE is_active = 1`
    ).get() as { total: number };

    // Monthly income
    const incomeResult = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE type = 'income' AND date >= ? AND date <= ?`
    ).get(startOfMonth, endOfMonth) as { total: number };

    // Monthly expenses
    const expenseResult = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE type = 'expense' AND date >= ? AND date <= ?`
    ).get(startOfMonth, endOfMonth) as { total: number };

    // Upcoming bills in next 30 days
    const billsResult = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM bills
       WHERE is_active = 1 AND next_due_date <= ?`
    ).get(next30Days) as { total: number; count: number };

    const income = incomeResult?.total || 0;
    const expenses = expenseResult?.total || 0;

    return {
      totalBalance: balanceResult?.total || 0,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      monthlyNet: income - expenses,
      upcomingBillsTotal: billsResult?.total || 0,
      upcomingBillsCount: billsResult?.count || 0,
    };
  },

  getCategorySpending(months = 1): CategorySpending[] {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1).getTime();
    const endDate = Date.now();

    const results = db.prepare(
      `SELECT
        t.category_id,
        COALESCE(c.name, 'Uncategorized') as name,
        c.icon,
        c.color,
        SUM(t.amount) as total
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
       GROUP BY t.category_id, c.name, c.icon, c.color
       ORDER BY total DESC`
    ).all(startDate, endDate) as { category_id: string; name: string; icon: string | null; color: string | null; total: number }[];

    const grandTotal = results.reduce((sum, r) => sum + r.total, 0);

    return results.map((r) => ({
      categoryId: r.category_id || 'uncategorized',
      categoryName: r.name,
      categoryIcon: r.icon,
      categoryColor: r.color,
      total: r.total,
      percentage: grandTotal > 0 ? (r.total / grandTotal) * 100 : 0,
    }));
  },

  getMonthlyTrends(months = 6): MonthlyTrend[] {
    const trends: MonthlyTrend[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startDate = date.getTime();
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime();

      const incomeResult = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE type = 'income' AND date >= ? AND date <= ?`
      ).get(startDate, endDate) as { total: number };

      const expenseResult = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE type = 'expense' AND date >= ? AND date <= ?`
      ).get(startDate, endDate) as { total: number };

      const income = incomeResult?.total || 0;
      const expenses = expenseResult?.total || 0;

      trends.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        monthNum: date.getMonth(),
        income,
        expenses,
        net: income - expenses,
      });
    }

    return trends;
  },

  getBudgetProgress(): BudgetProgress[] {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

    const results = db.prepare(
      `SELECT
        b.category_id,
        c.name as category_name,
        b.amount as budget_amount,
        COALESCE(SUM(t.amount), 0) as spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.type = 'expense'
         AND t.date >= ? AND t.date <= ?
       WHERE b.period = 'monthly'
         AND (b.end_date IS NULL OR b.end_date >= ?)
       GROUP BY b.category_id, c.name, b.amount`
    ).all(startOfMonth, endOfMonth, startOfMonth) as { category_id: string; category_name: string; budget_amount: number; spent: number }[];

    return results.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      budgetAmount: r.budget_amount,
      spent: r.spent,
      remaining: r.budget_amount - r.spent,
      percentage: r.budget_amount > 0 ? (r.spent / r.budget_amount) * 100 : 0,
      isOverBudget: r.spent > r.budget_amount,
    }));
  },

  getSpendingPredictions(): SpendingPrediction[] {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysRemaining = daysInMonth - dayOfMonth;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();

    // Get current month spending
    const currentMonth = db.prepare(
      `SELECT
        t.category_id,
        COALESCE(c.name, 'Uncategorized') as name,
        SUM(t.amount) as total
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.type = 'expense' AND t.date >= ?
       GROUP BY t.category_id, c.name
       ORDER BY total DESC
       LIMIT 5`
    ).all(startOfMonth) as { category_id: string; name: string; total: number }[];

    // Get last month spending for comparison
    const lastMonth = db.prepare(
      `SELECT
        t.category_id,
        SUM(t.amount) as total
       FROM transactions t
       WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
       GROUP BY t.category_id`
    ).all(startOfLastMonth, endOfLastMonth) as { category_id: string; total: number }[];

    const lastMonthMap = new Map(lastMonth.map((l) => [l.category_id, l.total]));

    return currentMonth.map((c) => {
      const dailyAvg = dayOfMonth > 0 ? c.total / dayOfMonth : 0;
      const projected = c.total + dailyAvg * daysRemaining;
      const lastMonthTotal = lastMonthMap.get(c.category_id) || 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;

      if (lastMonthTotal > 0) {
        trendPercent = ((projected - lastMonthTotal) / lastMonthTotal) * 100;
        if (trendPercent > 10) trend = 'up';
        else if (trendPercent < -10) trend = 'down';
      }

      return {
        category: c.name,
        currentSpent: c.total,
        projectedMonthly: projected,
        dailyAverage: dailyAvg,
        trend,
        trendPercent,
      };
    });
  },

  getRecentTransactions(limit = 5): Transaction[] {
    return db.prepare('SELECT * FROM transactions ORDER BY date DESC LIMIT ?').all(limit) as Transaction[];
  },

  getUpcomingBills(limit = 5): Bill[] {
    return db.prepare('SELECT * FROM bills WHERE is_active = 1 ORDER BY next_due_date LIMIT ?').all(limit) as Bill[];
  },
};
