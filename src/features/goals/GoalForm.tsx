import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { goalRepo } from '@/infrastructure/api/repositories';

const GOAL_ICONS = [
  '🎯', '🏠', '🚗', '✈️', '💍', '🎓', '💻', '📱',
  '🏖️', '🎸', '🎮', '👶', '🏋️', '💊', '🛋️', '🎁',
  '💰', '📈', '🏦', '🛡️', '🎪', '🚀', '🌴', '⭐'
];

const GOAL_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  target_amount: z.string().min(1, 'Target amount is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be a positive number'
  ),
  description: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.string().refine(
    (val) => !val || (!isNaN(parseInt(val)) && parseInt(val) >= 1 && parseInt(val) <= 10),
    'Priority must be between 1 and 10'
  ),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function GoalForm({ onSuccess, onCancel }: GoalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('🎯');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      target_amount: '',
      description: '',
      deadline: '',
      priority: '5',
    },
  });

  const onSubmit = async (data: GoalFormData) => {
    setIsSubmitting(true);
    try {
      await goalRepo.create({
        name: data.name,
        target_amount: parseFloat(data.target_amount),
        description: data.description || undefined,
        deadline: data.deadline ? new Date(data.deadline).getTime() : undefined,
        priority: data.priority ? parseInt(data.priority) : 5,
        icon: selectedIcon,
        color: selectedColor,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to save goal:', err);
      alert('Failed to save goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions = Array.from({ length: 10 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} ${i === 0 ? '(Lowest)' : i === 9 ? '(Highest)' : ''}`.trim(),
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Goal Name"
        placeholder="e.g., New Car, Vacation, Emergency Fund"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Target Amount"
        type="number"
        step="0.01"
        prefix="$"
        placeholder="0.00"
        error={errors.target_amount?.message}
        {...register('target_amount')}
      />

      <Input
        label="Description (optional)"
        placeholder="What's this goal for?"
        {...register('description')}
      />

      <Input
        label="Target Date (optional)"
        type="date"
        {...register('deadline')}
      />

      <Select
        label="Priority"
        options={priorityOptions}
        error={errors.priority?.message}
        {...register('priority')}
      />

      {/* Icon Picker */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setSelectedIcon(icon)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                selectedIcon === icon
                  ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500'
                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {GOAL_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full transition-all ${
                selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2 rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Create Goal'}
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
