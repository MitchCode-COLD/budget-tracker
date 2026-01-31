import { Hono } from 'hono';
import { billRepo } from '../repositories';

export const billRoutes = new Hono();

billRoutes.get('/', (c) => {
  const bills = billRepo.getAll();
  return c.json(bills);
});

billRoutes.get('/upcoming', (c) => {
  const days = parseInt(c.req.query('days') || '30');
  const bills = billRepo.getUpcoming(days);
  return c.json(bills);
});

billRoutes.post('/', async (c) => {
  const data = await c.req.json();
  const bill = billRepo.create(data);
  return c.json(bill, 201);
});

billRoutes.post('/:id/mark-paid', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const createTransaction = body.createTransaction !== false;
  billRepo.markPaid(c.req.param('id'), createTransaction);
  return c.json({ success: true });
});

billRoutes.delete('/:id', (c) => {
  billRepo.delete(c.req.param('id'));
  return c.json({ success: true });
});
