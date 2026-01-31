export default function CategoryList() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-500 dark:text-slate-400">Organize your transactions with categories</p>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Income Categories</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">No income categories yet.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Expense Categories</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">No expense categories yet.</p>
        </div>
      </div>
    </div>
  );
}
