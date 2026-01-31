import { Hono } from 'hono';
import { accountRepo } from '../repositories';

export const accountRoutes = new Hono();

accountRoutes.get('/', (c) => {
  const accounts = accountRepo.getAll();
  return c.json(accounts);
});

accountRoutes.get('/:id', (c) => {
  const account = accountRepo.getById(c.req.param('id'));
  if (!account) {
    return c.json({ error: 'Account not found' }, 404);
  }
  return c.json(account);
});

accountRoutes.post('/', async (c) => {
  const data = await c.req.json();
  const account = accountRepo.create(data);
  return c.json(account, 201);
});

accountRoutes.patch('/:id', async (c) => {
  const data = await c.req.json();
  const account = accountRepo.update(c.req.param('id'), data);
  return c.json(account);
});

accountRoutes.delete('/:id', (c) => {
  accountRepo.delete(c.req.param('id'));
  return c.json({ success: true });
});
