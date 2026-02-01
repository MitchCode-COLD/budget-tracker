import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Account, Category, accountRepo, categoryRepo, billRepo } from '@/infrastructure/api/repositories';

const billSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.string().min(1, 'Amount is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be a positive number'
  ),
  date: z.string().min(1, 'Date is required'),
  frequency: z.enum(['weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly']),
  category_id: z.string().optional(),
  account_id: z.string().optional(),
  reminder_days: z.string().optional(),
});

type BillFormData = z.infer<typeof billSchema>;
type ItemType = 'income' | 'expense';

interface BillFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BillForm({ onSuccess, onCancel }: BillFormProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemType, setItemType] = useState<ItemType>('expense');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: '',
      amount: '',
      date: new Date().toISOString().split('T')[0], // Default to today
      frequency: 'monthly',
      reminder_days: '3',
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accts, cats] = await Promise.all([
          accountRepo.getAll(),
          categoryRepo.getAll(),
        ]);
        setAccounts(accts);
        setAllCategories(cats);
      } catch (err) {
        console.error('Failed to load form data:', err);
      }
    };
    loadData();
  }, []);

  // Filter categories based on item type
  const filteredCategories = allCategories.filter(c => c.type === itemType);

  // Reset category when type changes
  useEffect(() => {
    setValue('category_id', '');
  }, [itemType, setValue]);

  const onSubmit = async (data: BillFormData) => {
    setIsSubmitting(true);
    try {
      await billRepo.create({
        name: data.name,
        amount: parseFloat(data.amount),
        date: new Date(data.date).getTime(),
        frequency: data.frequency,
        type: itemType,
        category_id: data.category_id || undefined,
        account_id: data.account_id || undefined,
        reminder_days: data.reminder_days ? parseInt(data.reminder_days) : 3,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const accountOptions = [
    { value: '', label: 'No account linked' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...filteredCategories.map((c) => ({ value: c.id, label: `${c.icon || ''} ${c.name}`.trim() })),
  ];

  const frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  const isIncome = itemType === 'income';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type Toggle */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
        <button
          type="button"
          onClick={() => setItemType('expense')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            itemType === 'expense'
              ? 'bg-red-500 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Bill / Expense
        </button>
        <button
          type="button"
          onClick={() => setItemType('income')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            itemType === 'income'
              ? 'bg-green-500 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Income / Paycheck
        </button>
      </div>

      <Input
        label={isIncome ? 'Income Source' : 'Bill Name'}
        placeholder={isIncome ? 'e.g., Employer Inc.' : 'e.g., Electric Bill'}
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Amount"
        type="number"
        step="0.01"
        prefix="$"
        placeholder="0.00"
        error={errors.amount?.message}
        {...register('amount')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={isIncome ? 'First Pay Date' : 'First Due Date'}
          type="date"
          error={errors.date?.message}
          {...register('date')}
        />

        <Select
          label="Frequency"
          options={frequencyOptions}
          error={errors.frequency?.message}
          {...register('frequency')}
        />
      </div>

      <Select
        label="Category"
        options={categoryOptions}
        error={errors.category_id?.message}
        {...register('category_id')}
      />

      <Select
        label={isIncome ? 'Deposit to Account' : 'Pay from Account'}
        options={accountOptions}
        error={errors.account_id?.message}
        {...register('account_id')}
      />

      <Input
        label={isIncome ? 'Remind me (days before)' : 'Remind me (days before due)'}
        type="number"
        min="0"
        max="30"
        placeholder="3"
        {...register('reminder_days')}
      />

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            isIncome
              ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
              : 'bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white'
          }`}
        >
          {isSubmitting ? 'Saving...' : isIncome ? 'Save Income' : 'Save Bill'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
