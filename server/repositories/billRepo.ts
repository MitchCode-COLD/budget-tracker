import { db, generateId, now } from '../db/database';
import { transactionRepo } from './transactionRepo';
import type { Bill } from '../types';

export const billRepo = {
  getAll(): Bill[] {
    return db.prepare('SELECT * FROM bills WHERE is_active = 1 ORDER BY next_due_date').all() as Bill[];
  },

  getUpcoming(days = 30): Bill[] {
    const endDate = Date.now() + days * 24 * 60 * 60 * 1000;
    return db.prepare(
      'SELECT * FROM bills WHERE is_active = 1 AND next_due_date <= ? ORDER BY next_due_date'
    ).all(endDate) as Bill[];
  },

  create(data: {
    name: string;
    amount: number;
    due_day: number;
    frequency: 'monthly' | 'quarterly' | 'yearly';
    type?: 'income' | 'expense';
    category_id?: string;
    account_id?: string;
    reminder_days?: number;
  }): Bill {
    const id = generateId();
    const timestamp = now();

    // Calculate next due date
    const today = new Date();
    let nextDue = new Date(today.getFullYear(), today.getMonth(), data.due_day);
    if (nextDue <= today) {
      nextDue = new Date(today.getFullYear(), today.getMonth() + 1, data.due_day);
    }

    db.prepare(
      `INSERT INTO bills (id, name, category_id, account_id, amount, due_day, frequency, type, next_due_date, reminder_days, is_active, is_paid, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
    ).run(
      id,
      data.name,
      data.category_id || null,
      data.account_id || null,
      data.amount,
      data.due_day,
      data.frequency,
      data.type || 'expense',
      nextDue.getTime(),
      data.reminder_days || 3,
      timestamp,
      timestamp
    );

    return db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as Bill;
  },

  markPaid(id: string, createTransaction = true): void {
    const timestamp = now();
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as Bill | undefined;

    if (!bill) return;

    // Calculate next due date based on frequency
    const currentDue = new Date(bill.next_due_date);
    let nextDue: Date;
    switch (bill.frequency) {
      case 'monthly':
        nextDue = new Date(currentDue.getFullYear(), currentDue.getMonth() + 1, bill.due_day);
        break;
      case 'quarterly':
        nextDue = new Date(currentDue.getFullYear(), currentDue.getMonth() + 3, bill.due_day);
        break;
      case 'yearly':
        nextDue = new Date(currentDue.getFullYear() + 1, currentDue.getMonth(), bill.due_day);
        break;
    }

    db.prepare('UPDATE bills SET is_paid = 0, next_due_date = ?, updated_at = ? WHERE id = ?').run(
      nextDue.getTime(),
      timestamp,
      id
    );

    // Optionally create a transaction
    if (createTransaction && bill.account_id) {
      const isIncome = bill.type === 'income';
      transactionRepo.create({
        account_id: bill.account_id,
        category_id: bill.category_id || undefined,
        amount: bill.amount,
        type: bill.type,
        date: timestamp,
        description: `${bill.name} (${isIncome ? 'Recurring Income' : 'Bill Payment'})`,
      });
    }
  },

  delete(id: string): void {
    db.prepare('UPDATE bills SET is_active = 0, updated_at = ? WHERE id = ?').run(now(), id);
  },
};
