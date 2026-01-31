import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { categoryRepo, Category } from '@/infrastructure/api/repositories';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['income', 'expense']),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  category?: Category;
  onSuccess: () => void;
  onCancel: () => void;
}

const ICON_OPTIONS = [
  { value: '', label: 'No icon' },
  { value: '💰', label: '💰 Money' },
  { value: '💵', label: '💵 Dollar' },
  { value: '💳', label: '💳 Card' },
  { value: '🏠', label: '🏠 Home' },
  { value: '🚗', label: '🚗 Car' },
  { value: '🍔', label: '🍔 Food' },
  { value: '🛒', label: '🛒 Shopping' },
  { value: '💊', label: '💊 Health' },
  { value: '🎮', label: '🎮 Entertainment' },
  { value: '📚', label: '📚 Education' },
  { value: '✈️', label: '✈️ Travel' },
  { value: '📱', label: '📱 Phone' },
  { value: '💡', label: '💡 Utilities' },
  { value: '👔', label: '👔 Work' },
  { value: '🎁', label: '🎁 Gifts' },
  { value: '💼', label: '💼 Business' },
  { value: '📈', label: '📈 Investment' },
  { value: '🏦', label: '🏦 Bank' },
  { value: '🎯', label: '🎯 Other' },
];

const COLOR_OPTIONS = [
  { value: '', label: 'No color' },
  { value: '#ef4444', label: '🔴 Red' },
  { value: '#f97316', label: '🟠 Orange' },
  { value: '#eab308', label: '🟡 Yellow' },
  { value: '#22c55e', label: '🟢 Green' },
  { value: '#3b82f6', label: '🔵 Blue' },
  { value: '#8b5cf6', label: '🟣 Purple' },
  { value: '#ec4899', label: '🩷 Pink' },
  { value: '#6b7280', label: '⚫ Gray' },
];

export default function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      type: category?.type || 'expense',
      icon: category?.icon || '',
      color: category?.color || '',
    },
  });

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await categoryRepo.update(category.id, {
          name: data.name,
          icon: data.icon || undefined,
          color: data.color || undefined,
        });
      } else {
        await categoryRepo.create({
          name: data.name,
          type: data.type,
          icon: data.icon || undefined,
          color: data.color || undefined,
        });
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save category:', err);
      alert('Failed to save category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Category Name"
        placeholder="e.g., Groceries"
        error={errors.name?.message}
        {...register('name')}
      />

      <Select
        label="Type"
        options={typeOptions}
        error={errors.type?.message}
        disabled={isEditing}
        {...register('type')}
      />

      <Select
        label="Icon"
        options={ICON_OPTIONS}
        error={errors.icon?.message}
        {...register('icon')}
      />

      <Select
        label="Color"
        options={COLOR_OPTIONS}
        error={errors.color?.message}
        {...register('color')}
      />

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2 rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Category' : 'Add Category'}
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
