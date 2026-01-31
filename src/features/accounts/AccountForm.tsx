import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { accountRepo } from '@/infrastructure/api/repositories';

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['checking', 'savings', 'credit', 'cash', 'investment']),
  balance: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AccountForm({ onSuccess, onCancel }: AccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'checking',
      balance: '0',
    },
  });

  const onSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true);
    try {
      await accountRepo.create({
        name: data.name,
        type: data.type,
        balance: data.balance ? parseFloat(data.balance) : 0,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to save account:', err);
      alert('Failed to save account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: 'checking', label: '🏦 Checking' },
    { value: 'savings', label: '💰 Savings' },
    { value: 'credit', label: '💳 Credit Card' },
    { value: 'cash', label: '💵 Cash' },
    { value: 'investment', label: '📈 Investment' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Account Name"
        placeholder="e.g., Main Checking"
        error={errors.name?.message}
        {...register('name')}
      />

      <Select
        label="Account Type"
        options={typeOptions}
        error={errors.type?.message}
        {...register('type')}
      />

      <Input
        label="Starting Balance"
        type="number"
        step="0.01"
        prefix="$"
        placeholder="0.00"
        error={errors.balance?.message}
        {...register('balance')}
      />

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2 rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Account'}
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
