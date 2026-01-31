import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Category, categoryRepo, budgetRepo } from '@/infrastructure/api/repositories';

const budgetSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  amount: z.string().min(1, 'Amount is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be a positive number'
  ),
  period: z.enum(['weekly', 'monthly', 'yearly']),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BudgetForm({ onSuccess, onCancel }: BudgetFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: '',
      amount: '',
      period: 'monthly',
    },
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoryRepo.getByType('expense');
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  const onSubmit = async (data: BudgetFormData) => {
    setIsSubmitting(true);
    try {
      await budgetRepo.create({
        category_id: data.category_id,
        amount: parseFloat(data.amount),
        period: data.period,
      });

      onSuccess();
    } catch (err) {
      console.error('Failed to save budget:', err);
      alert('Failed to save budget. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'Select a category...' },
    ...categories.map((c) => ({ value: c.id, label: `${c.icon || ''} ${c.name}`.trim() })),
  ];

  const periodOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Category"
        options={categoryOptions}
        error={errors.category_id?.message}
        {...register('category_id')}
      />

      <Input
        label="Budget Amount"
        type="number"
        step="0.01"
        prefix="$"
        placeholder="0.00"
        error={errors.amount?.message}
        {...register('amount')}
      />

      <Select
        label="Period"
        options={periodOptions}
        error={errors.period?.message}
        {...register('period')}
      />

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2 rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Budget'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
