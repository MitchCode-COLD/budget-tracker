import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { backupService, ImportResult } from '@/infrastructure/api/backupService';

interface ImportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onImportComplete: (result: ImportResult) => void;
}

export default function ImportOptionsModal({
  isOpen,
  onClose,
  file,
  onImportComplete,
}: ImportOptionsModalProps) {
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [isImporting, setIsImporting] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check file when it changes
  useEffect(() => {
    if (file && isOpen) {
      setIsChecking(true);
      setCheckError(null);
      setPassword('');

      backupService.checkFile(file).then((result) => {
        if (!result.valid) {
          setCheckError(result.error || 'Invalid file');
        } else {
          setIsEncrypted(result.encrypted);
        }
        setIsChecking(false);
      });
    }
  }, [file, isOpen]);

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await backupService.importFromFile(file, {
        mode,
        password: isEncrypted ? password : undefined,
      });
      onImportComplete(result);
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setMode('replace');
    setCheckError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Options">
      <div className="space-y-4">
        {isChecking ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            Checking file...
          </div>
        ) : checkError ? (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            {checkError}
          </div>
        ) : (
          <>
            {isEncrypted && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm">
                This backup is password protected. Enter the password to continue.
              </div>
            )}

            {isEncrypted && (
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter backup password"
              />
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Import Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="radio"
                    name="mode"
                    value="replace"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                    className="mt-1 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Replace All Data</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Delete all existing data and replace with backup contents. Use this to restore to a previous state.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="radio"
                    name="mode"
                    value="merge"
                    checked={mode === 'merge'}
                    onChange={() => setMode('merge')}
                    className="mt-1 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Merge Data</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Keep existing data and add new records from the backup. Duplicates (by ID) will be skipped.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {mode === 'replace' && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                Warning: This will permanently delete all your current data!
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleImport}
            disabled={isImporting || isChecking || !!checkError || (isEncrypted && !password)}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2 rounded-lg font-medium transition-colors"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
