import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Account, Category, accountRepo, categoryRepo, transactionRepo } from '@/infrastructure/api/repositories';
import { useCurrencyFormatter } from '@/stores/settingsStore';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.string().min(1, 'Amount is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be a positive number'
  ),
  account_id: z.string().min(1, 'Account is required'),
  category_id: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TransactionForm({ onSuccess, onCancel }: TransactionFormProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formatCurrency = useCurrencyFormatter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0], // Default to today
      amount: '',
      account_id: '',
      description: '',
    },
  });

  const transactionType = watch('type');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accts, cats] = await Promise.all([
          accountRepo.getAll(),
          categoryRepo.getAll(),
        ]);
        setAccounts(accts);
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load form data:', err);
      }
    };
    loadData();
  }, []);

  const filteredCategories = categories.filter((c) => c.type === transactionType);

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      await transactionRepo.create({
        account_id: data.account_id,
        category_id: data.category_id || undefined,
        amount: parseFloat(data.amount),
        type: data.type,
        date: new Date(data.date).getTime(),
        description: data.description || undefined,
        notes: data.notes || undefined,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      alert('Failed to save transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const accountOptions = [
    { value: '', label: 'Select an account...' },
    ...accounts.map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` })),
  ];

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...filteredCategories.map((c) => ({ value: c.id, label: `${c.icon || ''} ${c.name}`.trim() })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex gap-2">
        <label className="flex-1">
          <input
            type="radio"
            {...register('type')}
            value="expense"
            className="sr-only peer"
          />
          <div className="peer-checked:bg-red-100 peer-checked:border-red-500 peer-checked:text-red-700 dark:peer-checked:bg-red-900/30 dark:peer-checked:border-red-500 dark:peer-checked:text-red-400 border-2 border-slate-200 dark:border-slate-600 rounded-lg py-2 text-center cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
            Expense
          </div>
        </label>
        <label className="flex-1">
          <input
            type="radio"
            {...register('type')}
            value="income"
            className="sr-only peer"
          />
          <div className="peer-checked:bg-green-100 peer-checked:border-green-500 peer-checked:text-green-700 dark:peer-checked:bg-green-900/30 dark:peer-checked:border-green-500 dark:peer-checked:text-green-400 border-2 border-slate-200 dark:border-slate-600 rounded-lg py-2 text-center cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
            Income
          </div>
        </label>
      </div>

      <Input
        label="Amount"
        type="number"
        step="0.01"
        prefix="$"
        placeholder="0.00"
        error={errors.amount?.message}
        {...register('amount')}
      />

      <Select
        label="Account"
        options={accountOptions}
        error={errors.account_id?.message}
        {...register('account_id')}
      />

      <Select
        label="Category"
        options={categoryOptions}
        error={errors.category_id?.message}
        {...register('category_id')}
      />

      <Input
        label="Date"
        type="date"
        error={errors.date?.message}
        {...register('date')}
      />

      <Input
        label="Description"
        placeholder="e.g., Grocery shopping"
        error={errors.description?.message}
        {...register('description')}
      />

      <Input
        label="Notes (optional)"
        placeholder="Any additional notes..."
        {...register('notes')}
      />

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2 rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Transaction'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>

      {accounts.length === 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
          You need to create an account first before adding transactions.
        </p>
      )}
    </form>
  );
}
