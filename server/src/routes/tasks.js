import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

const VALID_STATUSES = ['pending', 'in_progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// GET /api/tasks — list all tasks, optional status/priority filters
router.get('/', async (req, res) => {
  try {
    const { status, priority } = req.query;

    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }
    if (priority && VALID_PRIORITIES.includes(priority)) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id — get a single task
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newTask = {
      title: title.trim(),
      description: description?.trim() || null,
      status: VALID_STATUSES.includes(status) ? status : 'pending',
      priority: VALID_PRIORITIES.includes(priority) ? priority : 'medium',
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id — update a task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;

    const updates = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      updates.title = title.trim();
    }
    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      updates.status = status;
    }
    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
      }
      updates.priority = priority;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id — delete a task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
