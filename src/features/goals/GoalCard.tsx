import { format } from 'date-fns';
import { Goal } from '@/infrastructure/api/repositories';
import { GoalPrediction } from '@/infrastructure/api/goalAnalyticsService';
import { useCurrencyFormatter } from '@/stores/settingsStore';

interface GoalCardProps {
  goal: Goal;
  prediction?: GoalPrediction;
  onContribute: () => void;
  onDelete: () => void;
}

export default function GoalCard({ goal, prediction, onContribute, onDelete }: GoalCardProps) {
  const formatCurrency = useCurrencyFormatter();
  const progressPercent = Math.min(100, (goal.current_amount / goal.target_amount) * 100);

  const riskColors = {
    low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${goal.color}20` }}
          >
            {goal.icon}
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-white">{goal.name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Priority: {goal.priority}/10
              {goal.deadline && ` • Due ${format(new Date(goal.deadline), 'MMM d, yyyy')}`}
            </p>
          </div>
        </div>
        {prediction && (
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${riskColors[prediction.riskLevel]}`}>
            {prediction.riskLevel === 'low' && 'On Track'}
            {prediction.riskLevel === 'medium' && 'Monitor'}
            {prediction.riskLevel === 'high' && 'At Risk'}
            {prediction.riskLevel === 'critical' && 'Critical'}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {formatCurrency(goal.current_amount)}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {formatCurrency(goal.target_amount)}
          </span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: goal.color,
            }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {progressPercent.toFixed(0)}% complete
        </p>
      </div>

      {/* Prediction Info */}
      {prediction && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 mb-4">
          {prediction.predictedCompletionDate ? (
            <div className="space-y-1">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Estimated completion:{' '}
                <strong>{format(prediction.predictedCompletionDate, 'MMMM yyyy')}</strong>
              </p>
              {goal.deadline && (
                <p className={`text-sm ${prediction.isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {prediction.isOnTrack
                    ? `${Math.abs(prediction.daysAheadOrBehind)} days ahead of schedule`
                    : `${Math.abs(prediction.daysAheadOrBehind)} days behind schedule`
                  }
                </p>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Suggested: {formatCurrency(prediction.monthlyAllocation)}/month
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${prediction.confidence}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {prediction.confidence}% confidence
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Unable to predict - add more transactions to improve accuracy
            </p>
          )}
        </div>
      )}

      {/* Risk Factors */}
      {prediction && prediction.riskFactors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Risk factors:</p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
            {prediction.riskFactors.map((factor, i) => (
              <li key={i}>• {factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onContribute}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Funds
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete goal"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
