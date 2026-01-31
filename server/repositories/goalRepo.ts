import { db, generateId, now } from '../db/database';
import type { Goal, GoalContribution } from '../types';

export const goalRepo = {
  getAll(): Goal[] {
    return db.prepare(
      "SELECT * FROM goals WHERE status != 'abandoned' ORDER BY priority DESC, deadline ASC"
    ).all() as Goal[];
  },

  getById(id: string): Goal | null {
    return db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | null;
  },

  getActive(): Goal[] {
    return db.prepare(
      "SELECT * FROM goals WHERE status = 'active' ORDER BY priority DESC, deadline ASC"
    ).all() as Goal[];
  },

  create(data: {
    name: string;
    target_amount: number;
    description?: string;
    deadline?: number;
    priority?: number;
    icon?: string;
    color?: string;
  }): Goal {
    const id = generateId();
    const timestamp = now();

    db.prepare(
      `INSERT INTO goals (id, name, description, target_amount, current_amount, deadline, priority, icon, color, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 'active', ?, ?)`
    ).run(
      id,
      data.name,
      data.description || null,
      data.target_amount,
      data.deadline || null,
      data.priority || 5,
      data.icon || '🎯',
      data.color || '#3b82f6',
      timestamp,
      timestamp
    );

    return this.getById(id)!;
  },

  update(id: string, data: Partial<Goal>): Goal {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.target_amount !== undefined) { updates.push('target_amount = ?'); values.push(data.target_amount); }
    if (data.current_amount !== undefined) { updates.push('current_amount = ?'); values.push(data.current_amount); }
    if (data.deadline !== undefined) { updates.push('deadline = ?'); values.push(data.deadline); }
    if (data.priority !== undefined) { updates.push('priority = ?'); values.push(data.priority); }
    if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
    if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    updates.push('updated_at = ?');
    values.push(now());
    values.push(id);

    db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id)!;
  },

  addContribution(
    goalId: string,
    amount: number,
    source: 'manual' | 'automatic' | 'adjustment',
    notes?: string
  ): void {
    const addContrib = db.transaction(() => {
      const id = generateId();
      const timestamp = now();

      db.prepare(
        `INSERT INTO goal_contributions (id, goal_id, amount, source, notes, date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, goalId, amount, source, notes || null, timestamp, timestamp);

      // Update goal's current_amount
      db.prepare('UPDATE goals SET current_amount = current_amount + ?, updated_at = ? WHERE id = ?').run(
        amount,
        timestamp,
        goalId
      );

      // Check if goal is now complete
      const goal = this.getById(goalId);
      if (goal && goal.current_amount >= goal.target_amount) {
        this.update(goalId, { status: 'completed' });
      }
    });

    addContrib();
  },

  getContributions(goalId: string): GoalContribution[] {
    return db.prepare(
      'SELECT * FROM goal_contributions WHERE goal_id = ? ORDER BY date DESC'
    ).all(goalId) as GoalContribution[];
  },

  delete(id: string): void {
    db.prepare("UPDATE goals SET status = 'abandoned', updated_at = ? WHERE id = ?").run(now(), id);
  },
};
