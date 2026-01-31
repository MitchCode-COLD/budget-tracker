import { Hono } from 'hono';
import { goalRepo } from '../repositories';
import { goalAnalyticsService } from '../services';

export const goalRoutes = new Hono();

goalRoutes.get('/', (c) => {
  const status = c.req.query('status');
  if (status === 'active') {
    return c.json(goalRepo.getActive());
  }
  return c.json(goalRepo.getAll());
});

goalRoutes.get('/analytics/predictions', (c) => {
  const predictions = goalAnalyticsService.predictGoalCompletionDates();
  return c.json(predictions);
});

goalRoutes.get('/analytics/safe-to-spend', (c) => {
  const result = goalAnalyticsService.calculateSafeToSpend();
  return c.json(result);
});

goalRoutes.get('/:id', (c) => {
  const goal = goalRepo.getById(c.req.param('id'));
  if (!goal) {
    return c.json({ error: 'Goal not found' }, 404);
  }
  return c.json(goal);
});

goalRoutes.get('/:id/contributions', (c) => {
  const contributions = goalRepo.getContributions(c.req.param('id'));
  return c.json(contributions);
});

goalRoutes.post('/', async (c) => {
  const data = await c.req.json();
  const goal = goalRepo.create(data);
  return c.json(goal, 201);
});

goalRoutes.post('/:id/contributions', async (c) => {
  const data = await c.req.json();
  goalRepo.addContribution(
    c.req.param('id'),
    data.amount,
    data.source,
    data.notes
  );
  return c.json({ success: true }, 201);
});

goalRoutes.patch('/:id', async (c) => {
  const data = await c.req.json();
  const goal = goalRepo.update(c.req.param('id'), data);
  return c.json(goal);
});

goalRoutes.delete('/:id', (c) => {
  goalRepo.delete(c.req.param('id'));
  return c.json({ success: true });
});
