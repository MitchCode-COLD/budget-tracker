import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import TransactionForm from './TransactionForm';
import { Transaction, Category, Account, transactionRepo, categoryRepo, accountRepo } from '@/infrastructure/api/repositories';
import { format } from 'date-fns';
import { useCurrencyFormatter } from '@/stores/settingsStore';

export default function TransactionList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [accounts, setAccounts] = useState<Map<string, Account>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const formatCurrency = useCurrencyFormatter();

  const loadData = useCallback(async () => {
    try {
      const [txns, cats, accts] = await Promise.all([
        transactionRepo.getAll(100),
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-500">Track your income and expenses</p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Transaction
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        {isLoading ? (
          <div className="p-6 text-center text-slate-500">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-500">No transactions yet.</p>
            <p className="text-sm text-slate-400 mt-1">
              Click "Add Transaction" to record your first one.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {transactions.map((tx) => (
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
                      {getAccountName(tx.account_id)} • {format(tx.date, 'MMM d, yyyy')}
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
