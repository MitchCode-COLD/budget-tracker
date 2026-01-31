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

categoryRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const category = categoryRepo.getById(id);
  if (!category) {
    return c.json({ error: 'Category not found' }, 404);
  }
  return c.json(category);
});

categoryRoutes.post('/', async (c) => {
  const data = await c.req.json();
  const category = categoryRepo.create(data);
  return c.json(category, 201);
});

categoryRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const data = await c.req.json();
  const category = categoryRepo.update(id, data);
  if (!category) {
    return c.json({ error: 'Category not found' }, 404);
  }
  return c.json(category);
});

categoryRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  const result = categoryRepo.delete(id);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }
  return c.json({ success: true });
});
