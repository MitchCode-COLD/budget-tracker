import { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import TransactionForm from './TransactionForm';
import { Transaction, Category, Account, transactionRepo, categoryRepo, accountRepo } from '@/infrastructure/api/repositories';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, isWithinInterval, isSaturday, isSunday } from 'date-fns';
import { useCurrencyFormatter } from '@/stores/settingsStore';

type DateFilter = 'today' | 'this-week' | 'this-weekend' | 'this-month' | 'last-month' | 'this-year' | 'all';
type TypeFilter = 'all' | 'income' | 'expense';

export default function TransactionList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [accounts, setAccounts] = useState<Map<string, Account>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('this-month');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const formatCurrency = useCurrencyFormatter();

  const loadData = useCallback(async () => {
    try {
      const [txns, cats, accts] = await Promise.all([
        transactionRepo.getAll(500),
        categoryRepo.getAll(),
        accountRepo.getAll(),
      ]);

      setTransactions(txns);
      setCategories(new Map(cats.map((c) => [c.id, c])));
      setAccounts(new Map(accts.map((a) => [a.id, a])));
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSuccess = () => {
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await transactionRepo.delete(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const cat = categories.get(categoryId);
    return cat ? `${cat.icon || ''} ${cat.name}`.trim() : 'Unknown';
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.get(accountId);
    return account?.name || 'Unknown';
  };

  // Get date range for filter
  const getDateRange = (filter: DateFilter): { start: Date; end: Date } | null => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'this-week':
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'this-weekend': {
        // Find this weekend (Saturday-Sunday)
        const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
        const saturday = new Date(weekEnd);
        saturday.setDate(saturday.getDate() - 1);
        return { start: startOfDay(saturday), end: endOfDay(weekEnd) };
      }
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month': {
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case 'this-year':
        return { start: startOfYear(now), end: endOfDay(now) };
      case 'all':
        return null;
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply date filter
    const dateRange = getDateRange(dateFilter);
    if (dateRange) {
      filtered = filtered.filter((tx) => {
        const txDate = new Date(tx.date);
        return isWithinInterval(txDate, { start: dateRange.start, end: dateRange.end });
      });
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.type === typeFilter);
    }

    // Sort by date descending
    return filtered.sort((a, b) => b.date - a.date);
  }, [transactions, dateFilter, typeFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [filteredTransactions]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Map<string, Transaction[]> = new Map();
    filteredTransactions.forEach((tx) => {
      const dateKey = format(tx.date, 'yyyy-MM-dd');
      const existing = groups.get(dateKey) || [];
      groups.set(dateKey, [...existing, tx]);
    });
    return groups;
  }, [filteredTransactions]);

  const dateFilterOptions = [
    { value: 'today', label: 'Today' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-weekend', label: 'This Weekend' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-500 dark:text-slate-400">Track your income and expenses</p>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-sm text-green-600 dark:text-green-400">Income</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totals.income)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Expenses</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totals.expenses)}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Net</p>
          <p className={`text-xl font-bold ${totals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(totals.net)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Date Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="date-filter" className="text-sm text-slate-600 dark:text-slate-400">Period:</label>
          <select
            id="date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {dateFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Type Filter Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Show:</span>
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('income')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                typeFilter === 'income'
                  ? 'bg-green-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <span>↓</span> Income Only
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('expense')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                typeFilter === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <span>↑</span> Expenses Only
            </button>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        {isLoading ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              {transactions.length === 0
                ? 'No transactions yet.'
                : 'No transactions found for this period.'}
            </p>
            {transactions.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Click "Add Transaction" to record your first one.
              </p>
            )}
          </div>
        ) : (
          <div>
            {Array.from(groupedTransactions.entries()).map(([dateKey, txns]) => {
              const dateObj = new Date(dateKey);
              const isWeekend = isSaturday(dateObj) || isSunday(dateObj);
              const dayTotal = txns.reduce((sum, tx) =>
                sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0
              );

              return (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className={`px-4 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center ${
                    isWeekend ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-slate-50 dark:bg-slate-800/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {format(dateObj, 'EEEE, MMM d')}
                      </span>
                      {isWeekend && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          Weekend
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      dayTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {dayTotal >= 0 ? '+' : ''}{formatCurrency(dayTotal)}
                    </span>
                  </div>

                  {/* Transactions for this date */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {txns.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                              tx.type === 'income'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {tx.type === 'income' ? '↓' : '↑'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white">
                              {tx.description || getCategoryName(tx.category_id)}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {getCategoryName(tx.category_id)} • {getAccountName(tx.account_id)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`font-semibold ${
                              tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Transaction"
      >
        <TransactionForm
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
