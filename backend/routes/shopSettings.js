import express from 'express';
const router = express.Router();

import { pool } from '../config/db.js';
import { parseNumber } from '../utils/helpers.js';

router.get('/', async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT "shopName", address, phone, email FROM "shopSettings" WHERE id = 1'
        )
        res.json({
            shopSettings: result.rows[0] || { shopName: '', address: '', phone: '', email: '' }
        })
    } catch (error) {
        console.error('Error fetching shop settings:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.put('/', async (req, res) => {
    try {
        const { shopName, address, phone, email } = req.body
        if (!shopName || !address || !phone || !email) {
            return res.status(400).json({ message: 'All shop settings fields are required' })
        }
        await pool.query(
            `INSERT INTO "shopSettings" (id, "shopName", address, phone, email)
             VALUES (1, $1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
                "shopName" = EXCLUDED."shopName",
                address = EXCLUDED.address,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email`,
            [shopName.trim(), address.trim(), phone.trim(), email.trim()]
        )
        res.json({ message: 'Shop settings saved' })
    } catch (error) {
        console.error('Error saving shop settings:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

export default router