import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import AccountForm from './AccountForm';
import { Account, accountRepo } from '@/infrastructure/api/repositories';
import { useCurrencyFormatter } from '@/stores/settingsStore';

const accountTypeIcons: Record<string, string> = {
  checking: '🏦',
  savings: '💰',
  credit: '💳',
  cash: '💵',
  investment: '📈',
};

export default function AccountList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const formatCurrency = useCurrencyFormatter();

  const loadData = useCallback(async () => {
    try {
      const data = await accountRepo.getAll();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
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
    if (!confirm('Are you sure you want to delete this account? This will also delete all associated transactions.')) return;

    try {
      await accountRepo.delete(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => {
    // Credit cards have negative impact on net worth
    const multiplier = acc.type === 'credit' ? -1 : 1;
    return sum + acc.balance * multiplier;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-500">Manage your bank accounts and wallets</p>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Account
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <p className="text-primary-100 text-sm">Total Net Worth</p>
          <p className="text-3xl font-bold mt-1">
            {formatCurrency(totalBalance)}
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        {isLoading ? (
          <div className="p-6 text-center text-slate-500">Loading...</div>
        ) : accounts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-500">No accounts yet.</p>
            <p className="text-sm text-slate-400 mt-1">
              Add your checking, savings, or credit card accounts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg">
                    {accountTypeIcons[account.type] || '💳'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{account.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{account.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`font-semibold ${
                      account.balance >= 0 ? 'text-slate-800 dark:text-white' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(account.balance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(account.id)}
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
        title="Add Account"
      >
        <AccountForm
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
