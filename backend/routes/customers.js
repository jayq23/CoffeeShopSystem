import express from 'express';
const router = express.Router();

import { pool } from '../config/db.js';
import { parseNumber } from '../utils/helpers.js';
router.get('/', async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, orders, "totalSpent" FROM customers ORDER BY id ASC'
        )
        res.json({ customers: result.rows })
    } catch (error) {
        console.error('Error fetching customers:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.post('/', async (req, res) => {
    try {
        const { name, orders, totalSpent } = req.body
        if (!name) return res.status(400).json({ message: 'Customer name is required' })
        const result = await pool.query(
            'INSERT INTO customers (name, orders, "totalSpent") VALUES ($1, $2, $3) RETURNING id',
            [name.trim(), parseNumber(orders), parseNumber(totalSpent)]
        )
        res.status(201).json({
            message: 'Customer created',
            customer: {
                id: result.rows[0].id,
                name: name.trim(),
                orders: parseNumber(orders),
                totalSpent: parseNumber(totalSpent),
            }
        })
    } catch (error) {
        console.error('Error creating customer:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { name, orders, totalSpent } = req.body
        if (!name) return res.status(400).json({ message: 'Customer name is required' })
        const result = await pool.query(
            'UPDATE customers SET name = $1, orders = $2, "totalSpent" = $3 WHERE id = $4',
            [name.trim(), parseNumber(orders), parseNumber(totalSpent), id]
        )
        if (result.rowCount === 0) return res.status(404).json({ message: 'Customer not found' })
        res.json({ message: 'Customer updated' })
    } catch (error) {
        console.error('Error updating customer:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const result = await pool.query('DELETE FROM customers WHERE id = $1', [id])
        if (result.rowCount === 0) return res.status(404).json({ message: 'Customer not found' })
        res.json({ message: 'Customer deleted' })
    } catch (error) {
        console.error('Error deleting customer:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

export default router