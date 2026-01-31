import { api } from './client';

export interface GoalPrediction {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  predictedCompletionDate: string | null;
  monthsToComplete: number | null;
  isAchievable: boolean;
  isOnTrack: boolean;
  daysAheadOrBehind: number;
  monthlyAllocation: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  confidence: number;
}

export interface SafeToSpendResult {
  safeAmount: number;
  totalAvailableBalance: number;
  reservedForBills: number;
  reservedForGoals: number;
  monthlyGoalAllocation: number;
  breakdown: {
    goalId: string;
    goalName: string;
    monthlyContribution: number;
  }[];
}

export const goalAnalyticsService = {
  async predictGoalCompletionDates(): Promise<GoalPrediction[]> {
    return api.get('/api/goals/analytics/predictions');
  },

  async calculateSafeToSpend(): Promise<SafeToSpendResult> {
    return api.get('/api/goals/analytics/safe-to-spend');
  },
};
