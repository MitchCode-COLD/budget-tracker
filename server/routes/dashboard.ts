import { Hono } from 'hono';
import { dashboardService } from '../services';

export const dashboardRoutes = new Hono();

dashboardRoutes.get('/stats', (c) => {
  const stats = dashboardService.getStats();
  return c.json(stats);
});

dashboardRoutes.get('/category-spending', (c) => {
  const months = parseInt(c.req.query('months') || '1');
  const spending = dashboardService.getCategorySpending(months);
  return c.json(spending);
});

dashboardRoutes.get('/monthly-trends', (c) => {
  const months = parseInt(c.req.query('months') || '6');
  const trends = dashboardService.getMonthlyTrends(months);
  return c.json(trends);
});

dashboardRoutes.get('/budget-progress', (c) => {
  const progress = dashboardService.getBudgetProgress();
  return c.json(progress);
});

dashboardRoutes.get('/spending-predictions', (c) => {
  const predictions = dashboardService.getSpendingPredictions();
  return c.json(predictions);
});

dashboardRoutes.get('/recent-transactions', (c) => {
  const limit = parseInt(c.req.query('limit') || '5');
  const transactions = dashboardService.getRecentTransactions(limit);
  return c.json(transactions);
});

dashboardRoutes.get('/upcoming-bills', (c) => {
  const limit = parseInt(c.req.query('limit') || '5');
  const bills = dashboardService.getUpcomingBills(limit);
  return c.json(bills);
});
