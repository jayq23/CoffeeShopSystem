import express from 'express';
const router = express.Router();

import { pool } from '../config/db.js';
import { parseNumber } from '../utils/helpers.js';
import { getAdminUsername, hashPassword, ensureHashedPassword } from '../utils/helpers.js';

router.get('/', async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, position, email, "joinDate", username FROM staffs ORDER BY id ASC'
        )
        res.json({ staffs: result.rows })
    } catch (error) {
        console.error('Error fetching staffs:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.post('/', async (req, res) => {
    try {
        const { name, email, joinDate, username, password, position } = req.body
        const normalizedUsername = username?.trim()?.toLowerCase()

        if (!name || !email || !joinDate || !normalizedUsername || !password) {
            return res.status(400).json({ message: 'All staff fields are required' })
        }
        if (normalizedUsername === getAdminUsername()) {
            return res.status(403).json({ message: 'Admin account is reserved for owner' })
        }

        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [normalizedUsername])
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Username already exists' })
        }

        const hashedPassword = hashPassword(password)

        const result = await pool.query(
            `INSERT INTO staffs (name, position, email, "joinDate", username, password)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [name.trim(), position || 'Cashier', email.trim(), joinDate, normalizedUsername, hashedPassword]
        )
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [normalizedUsername, hashedPassword, 'user']
        )

        res.status(201).json({
            message: 'Staff created',
            staff: {
                id: result.rows[0].id,
                name: name.trim(),
                position: position || 'Cashier',
                email: email.trim(),
                joinDate,
                username: normalizedUsername,
            }
        })
    } catch (error) {
        console.error('Error creating staff:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { name, email, joinDate, username, password, position } = req.body
        const normalizedUsername = username?.trim()?.toLowerCase()

        if (!name || !email || !joinDate || !normalizedUsername || !password) {
            return res.status(400).json({ message: 'All staff fields are required' })
        }
        if (normalizedUsername === getAdminUsername()) {
            return res.status(403).json({ message: 'Admin account is reserved for owner' })
        }

        const currentStaffRes = await pool.query('SELECT username FROM staffs WHERE id = $1', [id])
        if (currentStaffRes.rows.length === 0) {
            return res.status(404).json({ message: 'Staff not found' })
        }
        const currentUsername = currentStaffRes.rows[0].username

        const conflictRes = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND username != $2',
            [normalizedUsername, currentUsername]
        )
        if (conflictRes.rows.length > 0) {
            return res.status(409).json({ message: 'Username already exists' })
        }

        const hashedPassword = ensureHashedPassword(password)

        await pool.query(
            `UPDATE staffs SET name = $1, position = $2, email = $3, "joinDate" = $4, username = $5, password = $6 WHERE id = $7`,
            [name.trim(), position || 'Cashier', email.trim(), joinDate, normalizedUsername, hashedPassword, id]
        )
        await pool.query(
            'UPDATE users SET username = $1, password = $2 WHERE username = $3 AND role = $4',
            [normalizedUsername, hashedPassword, currentUsername, 'user']
        )

        res.json({ message: 'Staff updated' })
    } catch (error) {
        console.error('Error updating staff:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const staffRes = await pool.query('SELECT username FROM staffs WHERE id = $1', [id])
        if (staffRes.rows.length === 0) return res.status(404).json({ message: 'Staff not found' })
        const { username } = staffRes.rows[0]

        await pool.query('DELETE FROM staffs WHERE id = $1', [id])
        await pool.query('DELETE FROM users WHERE username = $1 AND role = $2', [username, 'user'])
        res.json({ message: 'Staff deleted' })
    } catch (error) {
        console.error('Error deleting staff:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

export default router