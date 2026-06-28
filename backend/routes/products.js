import express from 'express';
const router = express.Router();

import { pool } from '../config/db.js';
import { parseNumber } from '../utils/helpers.js';

router.get('/', async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, stock, price, sales, category, image FROM products ORDER BY id ASC'
        )
        res.json({ products: result.rows })
    } catch (error) {
        console.error('Error fetching products:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.post('/', async (req, res) => {
    try {
        const { name, stock, price, category, sales, image } = req.body
        if (!name || !category) {
            return res.status(400).json({ message: 'Name and category are required' })
        }
        const result = await pool.query(
            'INSERT INTO products (name, stock, price, sales, category, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [name.trim(), parseNumber(stock), parseNumber(price), parseNumber(sales), category, image || null]
        )
        res.status(201).json({
            message: 'Product created',
            product: {
                id: result.rows[0].id,
                name: name.trim(),
                stock: parseNumber(stock),
                price: parseNumber(price),
                sales: parseNumber(sales),
                category,
                image: image || null,
            }
        })
    } catch (error) {
        console.error('Error creating product:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { name, stock, price, category, image } = req.body
        if (!name || !category) {
            return res.status(400).json({ message: 'Name and category are required' })
        }
        const result = await pool.query(
            'UPDATE products SET name = $1, stock = $2, price = $3, category = $4, image = $5 WHERE id = $6',
            [name.trim(), parseNumber(stock), parseNumber(price), category, image || null, id]
        )
        if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' })
        res.json({ message: 'Product updated' })
    } catch (error) {
        console.error('Error updating product:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const result = await pool.query('DELETE FROM products WHERE id = $1', [id])
        if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' })
        res.json({ message: 'Product deleted' })
    } catch (error) {
        console.error('Error deleting product:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

export default router