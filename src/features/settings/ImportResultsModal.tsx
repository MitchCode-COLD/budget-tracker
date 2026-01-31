import Modal from '@/components/ui/Modal';
import { ImportResult } from '@/infrastructure/api/backupService';

interface ImportResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ImportResult | null;
}

export default function ImportResultsModal({ isOpen, onClose, result }: ImportResultsModalProps) {
  if (!result) return null;

  const hasErrors = result.errors.length > 0;

  const totalAdded =
    result.summary.accountsAdded +
    result.summary.categoriesAdded +
    result.summary.transactionsAdded +
    result.summary.billsAdded +
    result.summary.goalsAdded +
    result.summary.budgetsAdded +
    result.summary.patternsAdded +
    result.summary.contributionsAdded;

  const totalSkipped =
    result.summary.accountsSkipped +
    result.summary.categoriesSkipped +
    result.summary.transactionsSkipped +
    result.summary.billsSkipped +
    result.summary.goalsSkipped +
    result.summary.budgetsSkipped +
    result.summary.patternsSkipped +
    result.summary.contributionsSkipped;

  const handleClose = () => {
    if (result.success) {
      // Refresh the page after successful import
      window.location.reload();
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Results">
      <div className="space-y-4">
        {/* Status Banner */}
        <div
          className={`p-3 rounded-lg ${
            result.success && !hasErrors
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : hasErrors && result.success
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}
        >
          {result.success && !hasErrors && 'Import completed successfully!'}
          {result.success && hasErrors && 'Import completed with some warnings.'}
          {!result.success && 'Import failed.'}
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <h4 className="font-medium text-slate-700 dark:text-slate-200">Summary</h4>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <p>Mode: {result.mode === 'merge' ? 'Merge' : 'Replace'}</p>
            <p>Records added: {totalAdded}</p>
            {result.mode === 'merge' && totalSkipped > 0 && (
              <p>Records skipped (already exist): {totalSkipped}</p>
            )}
          </div>

          {/* Detailed breakdown */}
          <div className="grid grid-cols-2 gap-2 text-sm mt-3">
            {result.summary.accountsAdded > 0 || result.summary.accountsSkipped > 0 ? (
              <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded">
                <span className="text-slate-500 dark:text-slate-400">Accounts:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {result.summary.accountsAdded} added
                </span>
                {result.mode === 'merge' && result.summary.accountsSkipped > 0 && (
                  <span className="text-slate-400"> / {result.summary.accountsSkipped} skipped</span>
                )}
              </div>
            ) : null}

            {result.summary.categoriesAdded > 0 || result.summary.categoriesSkipped > 0 ? (
              <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded">
                <span className="text-slate-500 dark:text-slate-400">Categories:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {result.summary.categoriesAdded} added
                </span>
                {result.mode === 'merge' && result.summary.categoriesSkipped > 0 && (
                  <span className="text-slate-400"> / {result.summary.categoriesSkipped} skipped</span>
                )}
              </div>
            ) : null}

            {result.summary.transactionsAdded > 0 || result.summary.transactionsSkipped > 0 ? (
              <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded">
                <span className="text-slate-500 dark:text-slate-400">Transactions:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {result.summary.transactionsAdded} added
                </span>
                {result.mode === 'merge' && result.summary.transactionsSkipped > 0 && (
                  <span className="text-slate-400"> / {result.summary.transactionsSkipped} skipped</span>
                )}
              </div>
            ) : null}

            {result.summary.billsAdded > 0 || result.summary.billsSkipped > 0 ? (
              <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded">
                <span className="text-slate-500 dark:text-slate-400">Bills:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {result.summary.billsAdded} added
                </span>
                {result.mode === 'merge' && result.summary.billsSkipped > 0 && (
                  <span className="text-slate-400"> / {result.summary.billsSkipped} skipped</span>
                )}
              </div>
            ) : null}

            {result.summary.goalsAdded > 0 || result.summary.goalsSkipped > 0 ? (
              <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded">
                <span className="text-slate-500 dark:text-slate-400">Goals:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {result.summary.goalsAdded} added
                </span>
                {result.mode === 'merge' && result.summary.goalsSkipped > 0 && (
                  <span className="text-slate-400"> / {result.summary.goalsSkipped} skipped</span>
                )}
              </div>
            ) : null}

            {result.summary.budgetsAdded > 0 || result.summary.budgetsSkipped > 0 ? (
              <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded">
                <span className="text-slate-500 dark:text-slate-400">Budgets:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {result.summary.budgetsAdded} added
                </span>
                {result.mode === 'merge' && result.summary.budgetsSkipped > 0 && (
                  <span className="text-slate-400"> / {result.summary.budgetsSkipped} skipped</span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Errors */}
        {hasErrors && (
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700 dark:text-slate-200">
              Issues ({result.errors.length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {result.errors.map((error, i) => (
                <div
                  key={i}
                  className="text-sm p-2 bg-red-50 dark:bg-red-900/10 rounded text-red-700 dark:text-red-400"
                >
                  <span className="font-medium capitalize">{error.entity}</span>
                  {error.field && <span className="text-red-500"> ({error.field})</span>}
                  : {error.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-medium transition-colors"
        >
          {result.success ? 'Done - Refresh Page' : 'Close'}
        </button>
      </div>
    </Modal>
  );
}
