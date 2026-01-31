import { Hono } from 'hono';
import { transactionRepo } from '../repositories';

export const transactionRoutes = new Hono();

transactionRoutes.get('/', (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (startDate && endDate) {
    const transactions = transactionRepo.getByDateRange(
      parseInt(startDate),
      parseInt(endDate)
    );
    return c.json(transactions);
  }

  const transactions = transactionRepo.getAll(limit);
  return c.json(transactions);
});

transactionRoutes.get('/monthly-totals', (c) => {
  const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());
  const month = parseInt(c.req.query('month') || (new Date().getMonth() + 1).toString());
  const totals = transactionRepo.getMonthlyTotals(year, month);
  return c.json(totals);
});

transactionRoutes.post('/', async (c) => {
  const data = await c.req.json();
  const transaction = transactionRepo.create(data);
  return c.json(transaction, 201);
});

transactionRoutes.delete('/:id', (c) => {
  transactionRepo.delete(c.req.param('id'));
  return c.json({ success: true });
});
