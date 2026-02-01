import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractTextFromPDF, pdfNeedsOCR } from '@/infrastructure/document/pdfExtractor';
import { performOCR, pdfPageToImage, OCRProgress } from '@/infrastructure/document/ocrProcessor';
import { parseBillData, suggestCategory, ParsedBillData } from '@/infrastructure/document/billParser';
import { billRepo, transactionRepo, accountRepo, categoryRepo, Account, Category } from '@/infrastructure/api/repositories';

type ScanState = 'idle' | 'processing' | 'review' | 'saving' | 'success' | 'error';
type TransactionType = 'income' | 'expense';

export default function DocumentScanner() {
  const navigate = useNavigate();
  const [state, setState] = useState<ScanState>('idle');
  const [progress, setProgress] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedBillData | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Form data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Editable fields for review
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');

  // Load accounts and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        const [accts, cats] = await Promise.all([
          accountRepo.getAll(),
          categoryRepo.getAll(),
        ]);
        setAccounts(accts);
        setCategories(cats);
        if (accts.length > 0) {
          setAccountId(accts[0].id);
        }
      } catch (err) {
        console.error('Failed to load form data:', err);
      }
    };
    loadData();
  }, []);

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(c => c.type === transactionType);

  // Update category when type changes
  useEffect(() => {
    const suggested = suggestCategory(vendor, transactionType);
    if (suggested) {
      setCategoryId(suggested);
    } else if (filteredCategories.length > 0) {
      setCategoryId(filteredCategories[0].id);
    } else {
      setCategoryId('');
    }
  }, [transactionType, vendor, filteredCategories]);

  const processFile = useCallback(async (file: File) => {
    setState('processing');
    setError('');
    setProgress('Reading file...');

    try {
      let text = '';

      if (file.type === 'application/pdf') {
        setProgress('Extracting text from PDF...');
        const needsOCR = await pdfNeedsOCR(file);

        if (needsOCR) {
          setProgress('PDF needs OCR, converting to image...');
          const imageBlob = await pdfPageToImage(file);

          if (imageBlob) {
            setProgress('Running OCR (this may take a moment)...');
            const ocrResult = await performOCR(
              new File([imageBlob], 'page.png', { type: 'image/png' }),
              (p: OCRProgress) => setProgress(`OCR: ${p.status} (${Math.round(p.progress * 100)}%)`)
            );

            if (ocrResult.success) {
              text = ocrResult.text;
            } else {
              throw new Error(ocrResult.error || 'OCR failed');
            }
          } else {
            throw new Error('Failed to convert PDF to image');
          }
        } else {
          const pdfResult = await extractTextFromPDF(file);
          if (pdfResult.success) {
            text = pdfResult.text;
          } else {
            throw new Error(pdfResult.error || 'Failed to extract PDF text');
          }
        }
      } else if (file.type.startsWith('image/')) {
        setProgress('Running OCR on image...');
        const ocrResult = await performOCR(file, (p: OCRProgress) =>
          setProgress(`OCR: ${p.status} (${Math.round(p.progress * 100)}%)`)
        );

        if (ocrResult.success) {
          text = ocrResult.text;
        } else {
          throw new Error(ocrResult.error || 'OCR failed');
        }
      } else {
        throw new Error('Unsupported file type. Please use PDF or image files.');
      }

      setProgress('Parsing document data...');
      const parsed = parseBillData(text);
      setParsedData(parsed);

      // Pre-fill editable fields
      setVendor(parsed.vendor || '');
      setAmount(parsed.amount?.toFixed(2) || '');
      setDueDate(parsed.dueDate ? formatDateForInput(parsed.dueDate) : formatDateForInput(new Date()));

      // Try to detect if this is income (paycheck) based on keywords
      const lowerText = text.toLowerCase();
      const isLikelyIncome = /(?:pay\s*stub|paycheck|net\s*pay|gross\s*pay|earnings|salary|wages|direct\s*deposit|employer)/i.test(lowerText);
      setTransactionType(isLikelyIncome ? 'income' : 'expense');

      setState('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process document');
      setState('error');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleSaveAsRecurring = async () => {
    if (!vendor || !amount || !accountId) {
      setError('Please fill in all required fields (name, amount, and account)');
      setState('error');
      return;
    }

    setState('saving');
    setProgress('Saving recurring item...');

    try {
      const dateValue = dueDate ? new Date(dueDate).getTime() : Date.now();

      await billRepo.create({
        name: vendor,
        amount: parseFloat(amount),
        date: dateValue,
        frequency,
        type: transactionType,
        category_id: categoryId || undefined,
        account_id: accountId,
        reminder_days: 3,
      });

      setState('success');
    } catch (err) {
      console.error('Failed to save recurring item:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
      setState('error');
    }
  };

  const handleSaveAsTransaction = async () => {
    if (!vendor || !amount || !accountId) {
      setError('Please fill in all required fields (name, amount, and account)');
      setState('error');
      return;
    }

    setState('saving');
    setProgress('Saving transaction...');

    try {
      const dateValue = dueDate ? new Date(dueDate).getTime() : Date.now();

      await transactionRepo.create({
        account_id: accountId,
        category_id: categoryId || undefined,
        amount: parseFloat(amount),
        type: transactionType,
        date: dateValue,
        description: vendor,
      });

      setState('success');
    } catch (err) {
      console.error('Failed to save transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
      setState('error');
    }
  };

  const resetScanner = () => {
    setState('idle');
    setParsedData(null);
    setVendor('');
    setAmount('');
    setDueDate('');
    setError('');
    setProgress('');
    setTransactionType('expense');
    setFrequency('monthly');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-500 dark:text-slate-400">Scan bills, receipts, or pay stubs to automatically extract data</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Supports PDF files and images (PNG, JPG)</p>
        </div>
      </div>

      {state === 'idle' && (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragOver
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="text-4xl mb-4">📄</div>
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">
            Drop a document here
          </p>
          <p className="text-slate-500 dark:text-slate-400 mb-4">or</p>
          <label className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors">
            Browse Files
            <input
              type="file"
              className="hidden"
              accept=".pdf,image/*"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      )}

      {state === 'processing' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200">{progress}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">This may take a few seconds...</p>
        </div>
      )}

      {state === 'saving' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="animate-spin text-4xl mb-4">💾</div>
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200">{progress}</p>
        </div>
      )}

      {state === 'success' && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="font-medium text-green-800 dark:text-green-300">Saved successfully!</p>
              <p className="text-green-600 dark:text-green-400 mt-1">Your {transactionType === 'income' ? 'income' : 'expense'} has been recorded.</p>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={resetScanner}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Scan Another
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/transactions')}
                  className="border border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 px-4 py-2 rounded-lg text-sm"
                >
                  View Transactions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Something went wrong</p>
              <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
              <button
                type="button"
                onClick={resetScanner}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {state === 'review' && parsedData && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Review Extracted Data</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                parsedData.confidence === 'high'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : parsedData.confidence === 'medium'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}
            >
              {parsedData.confidence} confidence
            </span>
          </div>

          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setTransactionType('expense')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                transactionType === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Expense / Bill
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('income')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                transactionType === 'income'
                  ? 'bg-green-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Income / Paycheck
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {transactionType === 'income' ? 'Source / Employer' : 'Vendor / Company'}
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={transactionType === 'income' ? 'e.g., Employer Inc.' : 'e.g., Electric Company'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 dark:text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label htmlFor="scanner-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                id="scanner-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="scanner-account" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Account
              </label>
              <select
                id="scanner-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {accounts.length === 0 && <option value="">No accounts - create one first</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="scanner-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                id="scanner-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">No category</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="scanner-frequency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Frequency (for recurring)
              </label>
              <select
                id="scanner-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {parsedData.accountNumber && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Account #: {parsedData.accountNumber}
            </p>
          )}

          {accounts.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                You need to create an account before saving. <button type="button" onClick={() => navigate('/accounts')} className="underline font-medium">Go to Accounts</button>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleSaveAsRecurring}
              disabled={accounts.length === 0}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                transactionType === 'income'
                  ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white'
              }`}
            >
              {transactionType === 'income' ? '💰 Save as Recurring Income' : '📋 Save as Recurring Bill'}
            </button>
            <button
              type="button"
              onClick={handleSaveAsTransaction}
              disabled={accounts.length === 0}
              className="flex-1 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📝 Save as One-Time
            </button>
            <button
              type="button"
              onClick={resetScanner}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>

          <details className="mt-4">
            <summary className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
              View raw extracted text
            </summary>
            <pre className="mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-600 dark:text-slate-400 overflow-auto max-h-48">
              {parsedData.rawText}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}
