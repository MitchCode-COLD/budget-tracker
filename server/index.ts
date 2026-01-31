import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'fs';
import path from 'path';

import { runMigrations } from './db/migrations';
import {
  accountRoutes,
  categoryRoutes,
  transactionRoutes,
  billRoutes,
  goalRoutes,
  budgetRoutes,
  dashboardRoutes,
  backupRoutes,
} from './routes';

const app = new Hono();

// CORS for development
app.use('/api/*', cors());

// API routes
app.route('/api/accounts', accountRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/transactions', transactionRoutes);
app.route('/api/bills', billRoutes);
app.route('/api/goals', goalRoutes);
app.route('/api/budgets', budgetRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/backup', backupRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Serve static frontend in production
app.use('/*', serveStatic({ root: './dist' }));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (c) => {
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf-8');
    return c.html(html);
  }
  return c.text('Budget Tracker - Build the frontend with `npm run build`', 404);
});

// Initialize database
console.log('Initializing database...');
runMigrations();

// Start server
const port = Number(process.env.PORT) || 5555;
console.log(`Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║       Budget Tracker Server Started        ║
  ╠════════════════════════════════════════════╣
  ║  Local:   http://localhost:${info.port}            ║
  ║  API:     http://localhost:${info.port}/api        ║
  ╚════════════════════════════════════════════╝
  `);
});

export default app;
