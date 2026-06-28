import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { hashPassword, todayIsoDate, getAdminUsername, getAdminPassword } from '../utils/helpers.js';

const router = express.Router();
// Registration route
router.post('/register', async (req, res) => {
    try {
        const { name, email, number, username, password } = req.body
        const normalizedUsername = username?.trim()?.toLowerCase()
        const normalizedEmail = email?.trim()?.toLowerCase()
        const role = 'user'

        if (!name || !normalizedEmail || !number || !normalizedUsername || !password) {
            return res.status(400).json({ message: 'All fields are required' })
        }
        if (normalizedUsername === getAdminUsername()) {
            return res.status(403).json({ message: 'Admin account is reserved for owner' })
        }

        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [normalizedUsername])
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Username already exists' })
        }

        const existingReg = await pool.query('SELECT id FROM registrations WHERE email = $1', [normalizedEmail])
        if (existingReg.rows.length > 0) {
            return res.status(409).json({ message: 'Email already exists' })
        }

        const hashedPassword = hashPassword(password)

        await pool.query(
            'INSERT INTO registrations (name, email, number, username, password, role) VALUES ($1, $2, $3, $4, $5, $6)',
            [name, normalizedEmail, number, normalizedUsername, hashedPassword, role]
        )
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [normalizedUsername, hashedPassword, role]
        )
        await pool.query(
            `INSERT INTO staffs (name, position, email, "joinDate", username, password)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [name, 'Cashier', normalizedEmail, todayIsoDate(), normalizedUsername, hashedPassword]
        )

        res.status(201).json({ message: 'Registration successful', user: { username: normalizedUsername, role } })
    } catch (error) {
        console.error('Error during registration:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})
// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password, role } = req.body
        const normalizedUsername = username?.trim()?.toLowerCase()

        if (!normalizedUsername || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' })
        }
        if (role !== 'admin' && role !== 'user') {
            return res.status(400).json({ message: 'Invalid role' })
        }
        if(role === 'admin'){
            if(normalizedUsername !== getAdminUsername()){
                return res.status(403).json({ message: 'Only owner account can access admin login' })
            }
            const isPasswordMatch = bcrypt.compareSync(password, getAdminPassword())
            if(!isPasswordMatch){
                return res.status(401).json({ message: 'Invalid credentials' })
            }
            return res.json({
                message: 'Login successful',
                user: { id: 0, username: normalizedUsername, role: 'admin' }
            })
        }
        //User login - DB lookup
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND role = $2',
            [normalizedUsername, role]
        )
        const user = result.rows[0]

        if (user && bcrypt.compareSync(password, user.password)) {
            res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } })
        } else {
            res.status(401).json({ message: 'Invalid credentials' })
        }
    } catch (error) {
        console.error('Error during login:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.get('/users', async (_req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role FROM users ORDER BY id ASC')
        res.json({ users: result.rows })
    } catch (error) {
        console.error('Error fetching users:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

export default router;