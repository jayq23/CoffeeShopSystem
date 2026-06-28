import express from 'express';
const router = express.Router();

import { pool } from '../config/db.js';
import { parseNumber } from '../utils/helpers.js';

router.get('/', async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, customer, items, total, date, details, "staffName" FROM orders ORDER BY id DESC'
        )
        const mapped = result.rows.map((row) => ({ ...row, staff: row.staffName || '' }))
        res.json({ orders: mapped })
    } catch (error) {
        console.error('Error fetching orders:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.post('/', async (req, res) => {
    const client = await pool.connect()
    try {
        const { customer, items, total, date, details, staffName, cartItems } = req.body

        if (!customer || !details || !date) {
            return res.status(400).json({ message: 'Customer, date, and details are required' })
        }

        // Validate stock
        if (Array.isArray(cartItems)) {
            for (const item of cartItems) {
                const productRes = await client.query(
                    'SELECT id, name, stock FROM products WHERE id = $1',
                    [item.id]
                )
                const product = productRes.rows[0]
                if (!product) {
                    return res.status(400).json({ message: `Product not found: ${item.name || item.id}` })
                }
                if (product.stock < item.quantity) {
                    return res.status(400).json({ message: `Not enough stock for ${product.name}. Available: ${product.stock}` })
                }
            }
        }

        await client.query('BEGIN')

        const orderRes = await client.query(
            `INSERT INTO orders (customer, items, total, date, details, "staffName", "cartItems")
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [customer.trim(), parseNumber(items), parseNumber(total), date, details, staffName || null, JSON.stringify(cartItems || [])]
        )
        const orderId = orderRes.rows[0].id

        // Decrement stock
        if (Array.isArray(cartItems)) {
            for (const item of cartItems) {
                await client.query(
                    'UPDATE products SET stock = stock - $1, sales = sales + $2 WHERE id = $3',
                    [parseNumber(item.quantity), parseNumber(item.quantity), item.id]
                )
            }
        }

        // Update or create customer
        const custRes = await client.query(
            'SELECT id FROM customers WHERE name = $1',
            [customer.trim()]
        )
        if (custRes.rows.length > 0) {
            await client.query(
                'UPDATE customers SET orders = orders + 1, "totalSpent" = "totalSpent" + $1 WHERE id = $2',
                [parseNumber(total), custRes.rows[0].id]
            )
        } else {
            await client.query(
                'INSERT INTO customers (name, orders, "totalSpent") VALUES ($1, $2, $3)',
                [customer.trim(), 1, parseNumber(total)]
            )
        }

        await client.query('COMMIT')

        res.status(201).json({
            message: 'Order created',
            order: {
                id: orderId,
                customer: customer.trim(),
                items: parseNumber(items),
                total: parseNumber(total),
                date,
                details,
                staffName: staffName || null,
            }
        })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('Error creating order:', error)
        res.status(500).json({ message: 'Internal server error' })
    } finally {
        client.release()
    }
})

router.delete('/:id', async (req, res) => {
    const client = await pool.connect()
    try {
        const { id } = req.params

        const orderRes = await client.query(
            'SELECT customer, total, "cartItems" FROM orders WHERE id = $1',
            [id]
        )
        if (orderRes.rows.length === 0) return res.status(404).json({ message: 'Order not found' })
        const order = orderRes.rows[0]

        await client.query('BEGIN')

        await client.query('DELETE FROM orders WHERE id = $1', [id])

        // Revert stock
        let cartItems = []
        try { cartItems = JSON.parse(order.cartItems || '[]') } catch (_) {}
        if (Array.isArray(cartItems)) {
            for (const item of cartItems) {
                await client.query(
                    'UPDATE products SET stock = stock + $1, sales = sales - $2 WHERE id = $3',
                    [parseNumber(item.quantity), parseNumber(item.quantity), item.id]
                )
            }
        }

        // Revert customer
        const custRes = await client.query(
            'SELECT id, orders, "totalSpent" FROM customers WHERE name = $1',
            [order.customer]
        )
        if (custRes.rows.length > 0) {
            const cust = custRes.rows[0]
            const newOrders = Math.max(0, cust.orders - 1)
            const newTotalSpent = Math.max(0, cust.totalSpent - parseNumber(order.total))
            if (newOrders === 0) {
                await client.query('DELETE FROM customers WHERE id = $1', [cust.id])
            } else {
                await client.query(
                    'UPDATE customers SET orders = $1, "totalSpent" = $2 WHERE id = $3',
                    [newOrders, newTotalSpent, cust.id]
                )
            }
        }

        await client.query('COMMIT')
        res.json({ message: 'Order deleted' })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('Error deleting order:', error)
        res.status(500).json({ message: 'Internal server error' })
    } finally {
        client.release()
    }
})

export default router