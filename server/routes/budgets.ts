import { Hono } from 'hono';
import { budgetRepo } from '../repositories';

export const budgetRoutes = new Hono();

budgetRoutes.get('/', (c) => {
  const budgets = budgetRepo.getAll();
  return c.json(budgets);
});

budgetRoutes.get('/:id', (c) => {
  const budget = budgetRepo.getById(c.req.param('id'));
  if (!budget) {
    return c.json({ error: 'Budget not found' }, 404);
  }
  return c.json(budget);
});

budgetRoutes.post('/', async (c) => {
  const data = await c.req.json();
  const budget = budgetRepo.create(data);
  return c.json(budget, 201);
});

budgetRoutes.patch('/:id', async (c) => {
  const data = await c.req.json();
  const budget = budgetRepo.update(c.req.param('id'), data);
  return c.json(budget);
});

budgetRoutes.delete('/:id', (c) => {
  budgetRepo.delete(c.req.param('id'));
  return c.json({ success: true });
});
