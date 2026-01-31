import { Hono } from 'hono';
import { categoryRepo } from '../repositories';

export const categoryRoutes = new Hono();

categoryRoutes.get('/', (c) => {
  const type = c.req.query('type') as 'income' | 'expense' | undefined;
  if (type) {
    const categories = categoryRepo.getByType(type);
    return c.json(categories);
  }
  const categories = categoryRepo.getAll();
  return c.json(categories);
});

categoryRoutes.post('/', async (c) => {
  const data = await c.req.json();
  const category = categoryRepo.create(data);
  return c.json(category, 201);
});
