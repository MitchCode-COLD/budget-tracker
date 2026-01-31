import { db } from '../db/database';
import { goalRepo, billRepo } from '../repositories';
import type { Goal } from '../types';

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

export interface MonthlyFinancials {
  month: number;
  year: number;
  income: number;
  expenses: number;
  netSavings: number;
}

interface SeasonalityFactor {
  month: number;
  expenseMultiplier: number;
}

export const goalAnalyticsService = {
  getAverageMonthlySavings(monthsBack: number = 6): number {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const result = db.prepare(
      `SELECT
        strftime('%Y-%m', date/1000, 'unixepoch') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
       FROM transactions
       WHERE date >= ?
       GROUP BY month
       ORDER BY month`
    ).all(startDate.getTime()) as { month: string; income: number; expenses: number }[];

    if (result.length === 0) return 0;

    const totalSavings = result.reduce((sum, m) => sum + (m.income - m.expenses), 0);
    return totalSavings / result.length;
  },

  getMonthlyFinancials(monthsBack: number = 12): MonthlyFinancials[] {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const result = db.prepare(
      `SELECT
        strftime('%Y-%m', date/1000, 'unixepoch') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
       FROM transactions
       WHERE date >= ?
       GROUP BY month
       ORDER BY month`
    ).all(startDate.getTime()) as { month: string; income: number; expenses: number }[];

    return result.map(r => {
      const [year, month] = r.month.split('-').map(Number);
      return {
        month: month - 1,
        year,
        income: r.income,
        expenses: r.expenses,
        netSavings: r.income - r.expenses,
      };
    });
  },

  getSeasonalityFactors(): SeasonalityFactor[] {
    const financials = this.getMonthlyFinancials(12);

    if (financials.length < 3) {
      return Array.from({ length: 12 }, (_, i) => ({ month: i, expenseMultiplier: 1.0 }));
    }

    const avgExpenses = financials.reduce((sum, m) => sum + m.expenses, 0) / financials.length;

    const monthlyExpenses: Record<number, number[]> = {};
    for (const f of financials) {
      if (!monthlyExpenses[f.month]) monthlyExpenses[f.month] = [];
      monthlyExpenses[f.month].push(f.expenses);
    }

    return Array.from({ length: 12 }, (_, month) => {
      const expenses = monthlyExpenses[month] || [];
      if (expenses.length === 0) return { month, expenseMultiplier: 1.0 };
      const avg = expenses.reduce((sum, e) => sum + e, 0) / expenses.length;
      return { month, expenseMultiplier: avgExpenses > 0 ? avg / avgExpenses : 1.0 };
    });
  },

  getUpcomingBillsTotal(days: number = 30): number {
    const bills = billRepo.getUpcoming(days);
    return bills.reduce((sum, bill) => sum + bill.amount, 0);
  },

  predictGoalCompletionDates(): GoalPrediction[] {
    const goals = goalRepo.getActive();
    if (goals.length === 0) return [];

    const avgMonthlySavings = this.getAverageMonthlySavings(6);
    const seasonality = this.getSeasonalityFactors();
    const financials = this.getMonthlyFinancials(6);

    const savingsVariance = this.calculateVariance(financials.map(f => f.netSavings));
    const dataMonths = financials.length;

    const totalPriorityWeight = goals.reduce((sum, g) => sum + g.priority, 0);
    const availableForGoals = Math.max(0, avgMonthlySavings * 0.9);

    const predictions: GoalPrediction[] = [];

    for (const goal of goals) {
      const remainingAmount = goal.target_amount - goal.current_amount;

      if (remainingAmount <= 0) {
        predictions.push({
          goalId: goal.id,
          goalName: goal.name,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount,
          remainingAmount: 0,
          predictedCompletionDate: new Date().toISOString(),
          monthsToComplete: 0,
          isAchievable: true,
          isOnTrack: true,
          daysAheadOrBehind: 0,
          monthlyAllocation: 0,
          riskLevel: 'low',
          riskFactors: [],
          confidence: 100,
        });
        continue;
      }

      const priorityWeight = goal.priority / totalPriorityWeight;
      let monthlyAllocation = availableForGoals * priorityWeight;

      if (goal.deadline) {
        const monthsUntilDeadline = this.monthsBetween(new Date(), new Date(goal.deadline));
        const requiredMonthly = remainingAmount / Math.max(1, monthsUntilDeadline);
        monthlyAllocation = Math.max(monthlyAllocation, requiredMonthly);
      }

      const { completionDate, monthsToComplete } = this.projectCompletion(
        remainingAmount,
        monthlyAllocation,
        seasonality
      );

      let isOnTrack = true;
      let daysAheadOrBehind = 0;
      if (goal.deadline && completionDate) {
        const deadlineDate = new Date(goal.deadline);
        daysAheadOrBehind = Math.round((deadlineDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
        isOnTrack = daysAheadOrBehind >= 0;
      }

      const { riskLevel, riskFactors } = this.assessRisk(
        goal,
        monthlyAllocation,
        avgMonthlySavings,
        savingsVariance,
        isOnTrack,
        daysAheadOrBehind
      );

      const confidence = this.calculateConfidence(dataMonths, savingsVariance, avgMonthlySavings);

      predictions.push({
        goalId: goal.id,
        goalName: goal.name,
        targetAmount: goal.target_amount,
        currentAmount: goal.current_amount,
        remainingAmount,
        predictedCompletionDate: completionDate?.toISOString() || null,
        monthsToComplete,
        isAchievable: monthlyAllocation > 0 && monthsToComplete !== null && monthsToComplete < 120,
        isOnTrack,
        daysAheadOrBehind,
        monthlyAllocation,
        riskLevel,
        riskFactors,
        confidence,
      });
    }

    return predictions;
  },

  calculateSafeToSpend(): SafeToSpendResult {
    const balanceResult = db.prepare(
      `SELECT COALESCE(SUM(balance), 0) as total
       FROM accounts
       WHERE is_active = 1 AND type IN ('checking', 'savings', 'cash')`
    ).get() as { total: number };
    const totalAvailableBalance = balanceResult?.total || 0;

    const reservedForBills = this.getUpcomingBillsTotal(30);

    const predictions = this.predictGoalCompletionDates();
    const breakdown = predictions
      .filter(p => p.monthlyAllocation > 0)
      .map(p => ({
        goalId: p.goalId,
        goalName: p.goalName,
        monthlyContribution: p.monthlyAllocation,
      }));

    const monthlyGoalAllocation = breakdown.reduce((sum, b) => sum + b.monthlyContribution, 0);
    const reservedForGoals = monthlyGoalAllocation;

    const emergencyBuffer = totalAvailableBalance * 0.1;
    const safeAmount = Math.max(
      0,
      totalAvailableBalance - reservedForBills - reservedForGoals - emergencyBuffer
    );

    return {
      safeAmount,
      totalAvailableBalance,
      reservedForBills,
      reservedForGoals,
      monthlyGoalAllocation,
      breakdown,
    };
  },

  projectCompletion(
    remainingAmount: number,
    monthlyAllocation: number,
    seasonality: SeasonalityFactor[]
  ): { completionDate: Date | null; monthsToComplete: number | null } {
    if (monthlyAllocation <= 0) {
      return { completionDate: null, monthsToComplete: null };
    }

    let accumulated = 0;
    let months = 0;
    const projectedDate = new Date();

    while (accumulated < remainingAmount && months < 120) {
      const currentMonth = projectedDate.getMonth();
      const factor = seasonality[currentMonth]?.expenseMultiplier || 1.0;
      const adjustedAllocation = monthlyAllocation / factor;
      accumulated += adjustedAllocation;
      projectedDate.setMonth(projectedDate.getMonth() + 1);
      months++;
    }

    if (months >= 120) {
      return { completionDate: null, monthsToComplete: null };
    }

    return { completionDate: projectedDate, monthsToComplete: months };
  },

  monthsBetween(date1: Date, date2: Date): number {
    const months = (date2.getFullYear() - date1.getFullYear()) * 12;
    return months + date2.getMonth() - date1.getMonth();
  },

  calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length) / (mean || 1);
  },

  assessRisk(
    goal: Goal,
    monthlyAllocation: number,
    avgMonthlySavings: number,
    savingsVariance: number,
    isOnTrack: boolean,
    daysAheadOrBehind: number
  ): { riskLevel: 'low' | 'medium' | 'high' | 'critical'; riskFactors: string[] } {
    const riskFactors: string[] = [];
    let riskScore = 0;

    if (monthlyAllocation > avgMonthlySavings * 0.9) {
      riskFactors.push('Monthly allocation exceeds available savings');
      riskScore += 3;
    }

    if (savingsVariance > 0.5) {
      riskFactors.push('High variability in monthly savings');
      riskScore += 2;
    }

    if (goal.deadline) {
      const monthsUntil = this.monthsBetween(new Date(), new Date(goal.deadline));
      if (monthsUntil < 3) {
        riskFactors.push('Deadline is very close');
        riskScore += 2;
      }

      if (!isOnTrack) {
        riskFactors.push(`Behind schedule by ${Math.abs(daysAheadOrBehind)} days`);
        riskScore += Math.min(3, Math.abs(daysAheadOrBehind) / 30);
      }
    }

    const remainingAmount = goal.target_amount - goal.current_amount;
    if (avgMonthlySavings > 0 && remainingAmount / avgMonthlySavings > 24) {
      riskFactors.push('Goal requires more than 2 years to complete');
      riskScore += 1;
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 5) riskLevel = 'critical';
    else if (riskScore >= 3) riskLevel = 'high';
    else if (riskScore >= 1) riskLevel = 'medium';
    else riskLevel = 'low';

    return { riskLevel, riskFactors };
  },

  calculateConfidence(dataMonths: number, savingsVariance: number, avgSavings: number): number {
    const historyScore = Math.min(dataMonths / 12, 1) * 40;
    const varianceScore = Math.max(0, 30 - savingsVariance * 60);
    const savingsScore = avgSavings > 0 ? 30 : 0;
    return Math.round(historyScore + varianceScore + savingsScore);
  },
};
