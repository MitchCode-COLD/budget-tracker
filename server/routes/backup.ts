import { Hono } from 'hono';
import { backupService } from '../services';
import type { ExportOptions, ImportOptions } from '../types';

export const backupRoutes = new Hono();

// Legacy GET export (backward compatibility)
backupRoutes.get('/export', (c) => {
  const backup = backupService.export();
  const filename = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
  c.header('Content-Type', 'application/json');
  return c.json(backup);
});

// Enhanced export with options (CSV, selective, encryption)
backupRoutes.post('/export', async (c) => {
  try {
    const options = (await c.req.json()) as ExportOptions;
    const dateStr = new Date().toISOString().split('T')[0];

    // CSV export for transactions
    if (options.format === 'csv') {
      const csv = backupService.exportCSV({
        startDate: options.dateRange?.startDate,
        endDate: options.dateRange?.endDate,
        dateFormat: options.dateFormat,
      });

      const filename = `budget-transactions-${dateStr}.csv`;
      c.header('Content-Disposition', `attachment; filename="${filename}"`);
      c.header('Content-Type', 'text/csv');
      return c.text(csv);
    }

    // JSON export (selective or full)
    let backup = backupService.exportSelective(options);

    // Encrypt if requested
    if (options.encrypted && options.password) {
      const encrypted = backupService.encryptBackup(backup, options.password);
      const filename = `budget-backup-${dateStr}.json`;
      c.header('Content-Disposition', `attachment; filename="${filename}"`);
      c.header('Content-Type', 'application/json');
      return c.json(encrypted);
    }

    const filename = `budget-backup-${dateStr}.json`;
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    c.header('Content-Type', 'application/json');
    return c.json(backup);
  } catch (err) {
    return c.json({ error: 'Export failed' }, 500);
  }
});

// Enhanced import with merge option and detailed results
backupRoutes.post('/import', async (c) => {
  try {
    const body = await c.req.json();

    // Support both old format (just backup data) and new format ({ data, options })
    let data: unknown;
    let options: ImportOptions = { mode: 'replace' };

    if (body.data !== undefined && body.options !== undefined) {
      // New format
      data = body.data;
      options = body.options as ImportOptions;
    } else if (body.version !== undefined || body.encrypted !== undefined) {
      // Old format - backup data directly
      data = body;
    } else {
      return c.json({ error: 'Invalid backup file format' }, 400);
    }

    const result = backupService.importWithOptions(data, options);

    if (!result.success && result.errors.length > 0) {
      // Check if any records were added despite errors
      const anyAdded = Object.values(result.summary).some((v, i) => i % 2 === 0 && v > 0);
      if (!anyAdded) {
        return c.json(result, 400);
      }
    }

    return c.json(result);
  } catch (err) {
    return c.json({
      success: false,
      mode: 'replace',
      summary: {
        accountsAdded: 0,
        accountsSkipped: 0,
        categoriesAdded: 0,
        categoriesSkipped: 0,
        transactionsAdded: 0,
        transactionsSkipped: 0,
        billsAdded: 0,
        billsSkipped: 0,
        goalsAdded: 0,
        goalsSkipped: 0,
        budgetsAdded: 0,
        budgetsSkipped: 0,
        patternsAdded: 0,
        patternsSkipped: 0,
        contributionsAdded: 0,
        contributionsSkipped: 0,
      },
      errors: [{ entity: 'backup', id: 'parse', message: 'Invalid backup file format' }],
    }, 400);
  }
});
