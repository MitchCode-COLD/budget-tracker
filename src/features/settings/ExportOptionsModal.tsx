import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useSettingsStore } from '@/stores/settingsStore';
import { backupService, ExportOptions } from '@/infrastructure/api/backupService';

const exportSchema = z.object({
  format: z.enum(['json', 'csv']),
  scope: z.enum(['all', 'transactions', 'accounts', 'categories']),
  useDateRange: z.boolean(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  encrypted: z.boolean(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => !data.encrypted || (data.password && data.password === data.confirmPassword),
  { message: 'Passwords must match', path: ['confirmPassword'] }
).refine(
  (data) => !data.encrypted || (data.password && data.password.length >= 8),
  { message: 'Password must be at least 8 characters', path: ['password'] }
);

type ExportFormData = z.infer<typeof exportSchema>;

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportOptionsModal({ isOpen, onClose }: ExportOptionsModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dateFormat } = useSettingsStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ExportFormData>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      format: 'json',
      scope: 'all',
      useDateRange: false,
      encrypted: false,
    },
  });

  const format = watch('format');
  const scope = watch('scope');
  const useDateRange = watch('useDateRange');
  const encrypted = watch('encrypted');

  const onSubmit = async (data: ExportFormData) => {
    setIsExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        format: data.format,
        scope: data.format === 'csv' ? 'transactions' : data.scope,
        dateFormat,
      };

      if (data.useDateRange && data.startDate && data.endDate) {
        options.dateRange = {
          startDate: new Date(data.startDate).getTime(),
          endDate: new Date(data.endDate).setHours(23, 59, 59, 999),
        };
      }

      if (data.encrypted && data.password) {
        options.encrypted = true;
        options.password = data.password;
      }

      await backupService.downloadExport(options);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    { value: 'json', label: 'JSON (Full backup)' },
    { value: 'csv', label: 'CSV (Spreadsheet)' },
  ];

  const scopeOptions = [
    { value: 'all', label: 'All Data' },
    { value: 'transactions', label: 'Transactions Only' },
    { value: 'accounts', label: 'Accounts Only' },
    { value: 'categories', label: 'Categories Only' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Options">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Select
          label="Export Format"
          options={formatOptions}
          {...register('format')}
        />

        {format === 'csv' ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            CSV export includes transactions only with resolved account and category names.
          </p>
        ) : (
          <Select
            label="What to Export"
            options={scopeOptions}
            {...register('scope')}
          />
        )}

        {(format === 'csv' || scope === 'transactions' || scope === 'all') && (
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                {...register('useDateRange')}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Filter by date range
              </span>
            </label>

            {useDateRange && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date"
                  type="date"
                  error={errors.startDate?.message}
                  {...register('startDate')}
                />
                <Input
                  label="End Date"
                  type="date"
                  error={errors.endDate?.message}
                  {...register('endDate')}
                />
              </div>
            )}
          </div>
        )}

        {format === 'json' && (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                {...register('encrypted')}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Password protect backup
              </span>
            </label>

            {encrypted && (
              <>
                <Input
                  label="Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Warning: If you forget this password, you will not be able to restore this backup.
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isExporting}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2 rounded-lg font-medium transition-colors"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
