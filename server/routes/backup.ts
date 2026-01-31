import { Hono } from 'hono';
import { backupService } from '../services';

export const backupRoutes = new Hono();

backupRoutes.get('/export', (c) => {
  const backup = backupService.export();
  const filename = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
  c.header('Content-Type', 'application/json');
  return c.json(backup);
});

backupRoutes.post('/import', async (c) => {
  try {
    const backup = await c.req.json();
    const result = backupService.import(backup);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ success: true, message: 'Data restored successfully' });
  } catch (err) {
    return c.json({ error: 'Invalid backup file format' }, 400);
  }
});
