import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import BudgetForm from './BudgetForm';
import { dashboardService, BudgetProgress } from '@/infrastructure/api/dashboardService';
import { budgetRepo } from '@/infrastructure/api/repositories';
import { useCurrencyFormatter } from '@/stores/settingsStore';

export default function BudgetList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await dashboardService.getBudgetProgress();
      setBudgets(data);
    } catch (err) {
      console.error('Failed to load budgets:', err);
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

  const handleDelete = async (budgetId: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      await budgetRepo.delete(budgetId);
      loadData();
    } catch (err) {
      console.error('Failed to delete budget:', err);
    }
  };

  const formatCurrency = useCurrencyFormatter();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-500 dark:text-slate-400">Set spending limits for each category</p>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Budget
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        {isLoading ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : budgets.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-500 dark:text-slate-400">No budgets set.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Create budgets to track your spending limits.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {budgets.map((budget) => (
              <div key={budget.categoryId} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{budget.categoryName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatCurrency(budget.spent)} of {formatCurrency(budget.budgetAmount)} spent
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-medium ${
                        budget.isOverBudget
                          ? 'text-red-600 dark:text-red-400'
                          : budget.percentage > 80
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {budget.isOverBudget
                        ? `${formatCurrency(Math.abs(budget.remaining))} over`
                        : `${formatCurrency(budget.remaining)} left`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(budget.categoryId)}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                  {budget.percentage.toFixed(0)}% used
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Budget"
      >
        <BudgetForm
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
