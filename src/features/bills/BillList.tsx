import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import BillForm from './BillForm';
import { Bill, Category, billRepo, categoryRepo } from '@/infrastructure/api/repositories';
import { format, differenceInDays } from 'date-fns';
import { useCurrencyFormatter } from '@/stores/settingsStore';

export default function BillList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const formatCurrency = useCurrencyFormatter();

  const loadData = useCallback(async () => {
    try {
      const [billData, cats] = await Promise.all([
        billRepo.getAll(),
        categoryRepo.getAll(),
      ]);

      setBills(billData);
      setCategories(new Map(cats.map((c) => [c.id, c])));
    } catch (err) {
      console.error('Failed to load bills:', err);
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

  const handleMarkPaid = async (id: string) => {
    try {
      await billRepo.markPaid(id, true);
      loadData();
    } catch (err) {
      console.error('Failed to mark bill as paid:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring item?')) return;

    try {
      await billRepo.delete(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete bill:', err);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const cat = categories.get(categoryId);
    return cat ? `${cat.icon || ''} ${cat.name}`.trim() : null;
  };

  const getDaysUntilDue = (nextDueDate: number) => {
    return differenceInDays(nextDueDate, Date.now());
  };

  const getDueStatus = (daysUntil: number, isIncome: boolean) => {
    if (daysUntil < 0) {
      return isIncome
        ? { label: 'Expected', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' }
        : { label: 'Overdue', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    }
    if (daysUntil === 0) {
      return isIncome
        ? { label: 'Today', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' }
        : { label: 'Due today', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
    }
    if (daysUntil <= 3) return { label: `${daysUntil} days`, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
    if (daysUntil <= 7) return { label: `${daysUntil} days`, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' };
    return { label: `${daysUntil} days`, color: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' };
  };

  // Filter bills
  const filteredBills = bills.filter((bill) => {
    if (filter === 'all') return true;
    return bill.type === filter;
  });

  // Summary totals - calculate monthly equivalent
  const getMonthlyMultiplier = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 52 / 12; // ~4.33 times per month
      case 'bi-weekly': return 26 / 12; // ~2.17 times per month
      case 'monthly': return 1;
      case 'quarterly': return 1 / 3;
      case 'yearly': return 1 / 12;
      default: return 1;
    }
  };

  const monthlyIncome = bills.filter(b => b.type === 'income').reduce((sum, b) => {
    return sum + (b.amount * getMonthlyMultiplier(b.frequency));
  }, 0);

  const monthlyExpenses = bills.filter(b => b.type === 'expense').reduce((sum, b) => {
    return sum + (b.amount * getMonthlyMultiplier(b.frequency));
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-500 dark:text-slate-400">Track recurring income and bills</p>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Recurring
        </button>
      </div>

      {/* Summary Cards */}
      {bills.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <p className="text-sm text-green-600 dark:text-green-400">Monthly Income</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(monthlyIncome)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-600 dark:text-red-400">Monthly Bills</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">{formatCurrency(monthlyExpenses)}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Net Monthly</p>
            <p className={`text-xl font-bold ${monthlyIncome - monthlyExpenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(monthlyIncome - monthlyExpenses)}
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {bills.length > 0 && (
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            All ({bills.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('income')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'income'
                ? 'bg-green-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Income ({bills.filter(b => b.type === 'income').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('expense')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'expense'
                ? 'bg-red-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Bills ({bills.filter(b => b.type === 'expense').length})
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        {isLoading ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : filteredBills.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              {filter === 'all' ? 'No recurring items scheduled.' : `No recurring ${filter} items.`}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Add your recurring income (paychecks) and bills to track your cash flow.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredBills.map((bill) => {
              const daysUntil = getDaysUntilDue(bill.next_due_date);
              const isIncome = bill.type === 'income';
              const status = getDueStatus(daysUntil, isIncome);
              const category = getCategoryName(bill.category_id);

              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      isIncome
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {isIncome ? '💰' : '📅'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{bill.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          isIncome
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {isIncome ? 'Income' : 'Bill'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {category && `${category} • `}
                        {isIncome ? 'Expected' : 'Due'} {format(bill.next_due_date, 'MMM d')} • {bill.frequency}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    <span className={`font-semibold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(bill.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMarkPaid(bill.id)}
                      className={`text-sm font-medium ${
                        isIncome
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-blue-600 hover:text-blue-700'
                      }`}
                      title={isIncome ? 'Mark as received' : 'Mark as paid'}
                    >
                      ✓ {isIncome ? 'Received' : 'Paid'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(bill.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
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
        title="Add Recurring Item"
      >
        <BillForm
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
