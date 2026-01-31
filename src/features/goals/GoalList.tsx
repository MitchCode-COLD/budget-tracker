import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import GoalForm from './GoalForm';
import GoalCard from './GoalCard';
import { Goal, goalRepo } from '@/infrastructure/api/repositories';
import { goalAnalyticsService, GoalPrediction, SafeToSpendResult } from '@/infrastructure/api/goalAnalyticsService';
import { useCurrencyFormatter } from '@/stores/settingsStore';

export default function GoalList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [predictions, setPredictions] = useState<Map<string, GoalPrediction>>(new Map());
  const [safeToSpend, setSafeToSpend] = useState<SafeToSpendResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const formatCurrency = useCurrencyFormatter();

  const loadData = useCallback(async () => {
    try {
      const [goalsData, predictionsData, safeData] = await Promise.all([
        goalRepo.getAll(),
        goalAnalyticsService.predictGoalCompletionDates(),
        goalAnalyticsService.calculateSafeToSpend(),
      ]);

      setGoals(goalsData);
      setPredictions(new Map(predictionsData.map(p => [p.goalId, p])));
      setSafeToSpend(safeData);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSuccess = () => {
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      await goalRepo.delete(id);
      loadData();
    }
  };

  const handleContribute = (goalId: string) => {
    setSelectedGoalId(goalId);
    setContributionAmount('');
    setIsContributeModalOpen(true);
  };

  const submitContribution = async () => {
    if (!selectedGoalId || !contributionAmount) return;

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await goalRepo.addContribution(selectedGoalId, amount, 'manual');
      setIsContributeModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to add contribution:', err);
      alert('Failed to add contribution. Please try again.');
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Safe to Spend Banner */}
      {safeToSpend && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm font-medium">Safe to Spend This Month</p>
              <p className="text-4xl font-bold mt-1">{formatCurrency(safeToSpend.safeAmount)}</p>
              <p className="text-primary-200 text-sm mt-2">
                Without affecting your {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right text-sm text-primary-200">
              <p>Total Balance: {formatCurrency(safeToSpend.totalAvailableBalance)}</p>
              <p>Reserved for Bills: {formatCurrency(safeToSpend.reservedForBills)}</p>
              <p>Reserved for Goals: {formatCurrency(safeToSpend.reservedForGoals)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-500 dark:text-slate-400">
            Track your savings goals with smart predictions
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Goal
        </button>
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Loading goals...
        </div>
      ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
            No goals yet
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Create your first savings goal to start tracking your progress with smart predictions.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                Active Goals ({activeGoals.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    prediction={predictions.get(goal.id)}
                    onContribute={() => handleContribute(goal.id)}
                    onDelete={() => handleDelete(goal.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                Completed Goals ({completedGoals.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-75">
                {completedGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onContribute={() => {}}
                    onDelete={() => handleDelete(goal.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Monthly Allocation Breakdown */}
      {safeToSpend && safeToSpend.breakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Suggested Monthly Allocations
          </h3>
          <div className="space-y-3">
            {safeToSpend.breakdown.map(item => (
              <div key={item.goalId} className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">{item.goalName}</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  {formatCurrency(item.monthlyContribution)}/mo
                </span>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-semibold">
              <span className="text-slate-800 dark:text-white">Total Monthly Goal Savings</span>
              <span className="text-primary-600 dark:text-primary-400">
                {formatCurrency(safeToSpend.monthlyGoalAllocation)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Goal"
      >
        <GoalForm
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Contribute Modal */}
      <Modal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        title="Add Funds to Goal"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={submitContribution}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-medium transition-colors"
            >
              Add Funds
            </button>
            <button
              onClick={() => setIsContributeModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
