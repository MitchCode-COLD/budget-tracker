import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import CategoryForm from './CategoryForm';
import { categoryRepo, Category } from '@/infrastructure/api/repositories';

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      const data = await categoryRepo.getAll();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddClick = () => {
    setEditingCategory(undefined);
    setShowModal(true);
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDeleteClick = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    setDeleteError(null);
    try {
      const result = await categoryRepo.delete(category.id);
      if (!result.success) {
        setDeleteError(result.error || 'Failed to delete category');
        return;
      }
      loadCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      setDeleteError('Failed to delete category. Please try again.');
    }
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setEditingCategory(undefined);
    loadCategories();
  };

  const handleFormCancel = () => {
    setShowModal(false);
    setEditingCategory(undefined);
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const renderCategoryItem = (category: Category) => (
    <div
      key={category.id}
      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg group"
    >
      <div className="flex items-center gap-3">
        {category.color && (
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
        )}
        <span className="text-lg">{category.icon}</span>
        <span className="text-slate-700 dark:text-slate-200">{category.name}</span>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => handleEditClick(category)}
          className="p-1.5 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={() => handleDeleteClick(category)}
          className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500 dark:text-slate-400">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-500 dark:text-slate-400">Organize your transactions with categories</p>
        <button
          onClick={handleAddClick}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Category
        </button>
      </div>

      {deleteError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {deleteError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-green-500">↑</span> Income Categories
          </h3>
          {incomeCategories.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No income categories yet.</p>
          ) : (
            <div className="space-y-2">
              {incomeCategories.map(renderCategoryItem)}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-red-500">↓</span> Expense Categories
          </h3>
          {expenseCategories.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No expense categories yet.</p>
          ) : (
            <div className="space-y-2">
              {expenseCategories.map(renderCategoryItem)}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleFormCancel}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <CategoryForm
          category={editingCategory}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>
    </div>
  );
}
