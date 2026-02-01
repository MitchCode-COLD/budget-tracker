import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { dashboardService, DashboardStats, CategorySpending, MonthlyTrend, BudgetProgress, SpendingPrediction } from '@/infrastructure/api/dashboardService';
import { Transaction, Bill, Category, categoryRepo, goalRepo, Goal } from '@/infrastructure/api/repositories';
import { goalAnalyticsService, GoalPrediction, SafeToSpendResult } from '@/infrastructure/api/goalAnalyticsService';
import { useCurrencyFormatter } from '@/stores/settingsStore';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [predictions, setPredictions] = useState<SpendingPrediction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalPredictions, setGoalPredictions] = useState<GoalPrediction[]>([]);
  const [safeToSpend, setSafeToSpend] = useState<SafeToSpendResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const formatCurrency = useCurrencyFormatter();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsData, spending, trends, budgets, preds, transactions, bills, cats, goalsData, goalPreds, safeData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getCategorySpending(1),
          dashboardService.getMonthlyTrends(6),
          dashboardService.getBudgetProgress(),
          dashboardService.getSpendingPredictions(),
          dashboardService.getRecentTransactions(5),
          dashboardService.getUpcomingBills(5),
          categoryRepo.getAll(),
          goalRepo.getActive(),
          goalAnalyticsService.predictGoalCompletionDates(),
          goalAnalyticsService.calculateSafeToSpend(),
        ]);

        setStats(statsData);
        setCategorySpending(spending);
        setMonthlyTrends(trends);
        setBudgetProgress(budgets);
        setPredictions(preds);
        setRecentTransactions(transactions);
        setUpcomingBills(bills);
        setCategories(new Map(cats.map((c) => [c.id, c])));
        setGoals(goalsData);
        setGoalPredictions(goalPreds);
        setSafeToSpend(safeData);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 dark:text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Balance"
          value={formatCurrency(stats?.totalBalance || 0)}
          trend={stats && stats.totalBalance >= 0 ? 'up' : 'down'}
          icon="💰"
        />
        <SummaryCard
          title="Income (This Month)"
          value={formatCurrency(stats?.monthlyIncome || 0)}
          trend="up"
          icon="📈"
        />
        <SummaryCard
          title="Expenses (This Month)"
          value={formatCurrency(stats?.monthlyExpenses || 0)}
          trend="down"
          icon="📉"
        />
        <SummaryCard
          title="Upcoming Bills"
          value={formatCurrency(stats?.upcomingBillsTotal || 0)}
          subtitle={`${stats?.upcomingBillsCount || 0} bills in 30 days`}
          trend="neutral"
          icon="📅"
        />
      </div>

      {/* Safe to Spend Banner */}
      {safeToSpend && safeToSpend.safeAmount > 0 && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm font-medium">Safe to Spend This Month</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(safeToSpend.safeAmount)}</p>
              <p className="text-primary-200 text-sm mt-1">
                Without affecting your {goals.length} active goal{goals.length !== 1 ? 's' : ''}
              </p>
            </div>
            <NavLink
              to="/goals"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              View Goals
            </NavLink>
          </div>
        </div>
      )}

      {/* Goals Progress */}
      {goals.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Savings Goals</h3>
            <NavLink to="/goals" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              View All
            </NavLink>
          </div>
          <div className="space-y-4">
            {goals.slice(0, 3).map((goal) => {
              const prediction = goalPredictions.find(p => p.goalId === goal.id);
              const progressPercent = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
              return (
                <div key={goal.id} className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: `${goal.color}20` }}
                  >
                    {goal.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-slate-800 dark:text-white truncate">{goal.name}</p>
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progressPercent}%`, backgroundColor: goal.color }}
                      />
                    </div>
                    {prediction?.predictedCompletionDate && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Est. completion: {format(prediction.predictedCompletionDate, 'MMM yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category - Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Spending by Category</h3>
          {categorySpending.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySpending}
                    dataKey="total"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ categoryName, percentage }) => `${categoryName} (${percentage.toFixed(0)}%)`}
                  >
                    {categorySpending.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm h-64 flex items-center justify-center">
              Add transactions to see spending breakdown
            </p>
          )}
        </div>

        {/* Monthly Trends - Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Income vs Expenses</h3>
          {monthlyTrends.some((t) => t.income > 0 || t.expenses > 0 || t.projectedExpenses > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends}>
                  <XAxis dataKey="month" tick={{ fill: '#64748b' }} />
                  <YAxis tick={{ fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="projectedExpenses" name="Expected" fill="#ef4444" fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm h-64 flex items-center justify-center">
              Add transactions to see monthly trends
            </p>
          )}
        </div>
      </div>

      {/* Budget Progress */}
      {budgetProgress.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Budget Progress</h3>
          <div className="space-y-4">
            {budgetProgress.map((budget) => (
              <div key={budget.categoryId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{budget.categoryName}</span>
                  <span className={budget.isOverBudget ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'}>
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.budgetAmount)}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budget.isOverBudget
                        ? 'bg-red-500'
                        : budget.percentage > 80
                        ? 'bg-amber-500'
                        : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictions */}
      {predictions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Spending Predictions</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Based on your current spending pace</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((pred) => (
              <div
                key={pred.category}
                className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
                <p className="font-medium text-slate-800 dark:text-white">{pred.category}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  {formatCurrency(pred.projectedMonthly)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Projected this month
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      pred.trend === 'up'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : pred.trend === 'down'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {pred.trend === 'up' ? '↑' : pred.trend === 'down' ? '↓' : '→'}
                    {Math.abs(pred.trendPercent).toFixed(0)}% vs last month
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Recent Transactions</h3>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const category = tx.category_id ? categories.get(tx.category_id) : null;
                return (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          tx.type === 'income'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {category?.icon || (tx.type === 'income' ? '↓' : '↑')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">
                          {tx.description || category?.name || 'Transaction'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {format(tx.date, 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-medium ${
                        tx.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No transactions yet</p>
          )}
        </div>

        {/* Upcoming Bills */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Upcoming Bills</h3>
          {upcomingBills.length > 0 ? (
            <div className="space-y-3">
              {upcomingBills.map((bill) => {
                const daysUntil = differenceInDays(bill.next_due_date, Date.now());
                return (
                  <div key={bill.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm">
                        📅
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{bill.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Due {format(bill.next_due_date, 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-slate-800 dark:text-white">
                        {formatCurrency(bill.amount)}
                      </span>
                      <p
                        className={`text-xs ${
                          daysUntil <= 3
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No upcoming bills</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

function SummaryCard({ title, value, subtitle, trend, icon }: SummaryCardProps) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-800 dark:text-white',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      </div>
      <p className={`text-2xl font-bold ${trendColors[trend]}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
