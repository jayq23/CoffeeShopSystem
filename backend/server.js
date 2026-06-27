const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const app = express()
const BCRYPT_ROUNDS = 10
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'jay123').trim().toLowerCase()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jay123'
const DEFAULT_ADMIN = {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    role: 'admin'
}
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://neutral-grounds.vercel.app',
]

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
}))
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

const parseNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const isBcryptHash = (value) => typeof value === 'string' && value.startsWith('$2')
const hashPassword = (plain) => bcrypt.hashSync(plain, BCRYPT_ROUNDS)
const ensureHashedPassword = (raw) => {
    if (!raw) return ''
    return isBcryptHash(raw) ? raw : hashPassword(raw)
}

const todayIsoDate = () => new Date().toISOString().split('T')[0]

// ─── DB INIT ─────────────────────────────────────────────────────────────────

async function initDB() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL
            )
        `)
        await client.query(`
            CREATE TABLE IF NOT EXISTS registrations (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                number TEXT NOT NULL,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL
            )
        `)
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                stock INTEGER NOT NULL,
                price INTEGER NOT NULL,
                sales INTEGER DEFAULT 0,
                category TEXT NOT NULL,
                image TEXT DEFAULT NULL
            )
        `)
        await client.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                orders INTEGER DEFAULT 0,
                "totalSpent" INTEGER DEFAULT 0
            )
        `)
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                customer TEXT NOT NULL,
                items INTEGER NOT NULL,
                total INTEGER NOT NULL,
                date TEXT NOT NULL,
                details TEXT NOT NULL,
                "staffName" TEXT,
                "cartItems" TEXT
            )
        `)
        await client.query(`
            CREATE TABLE IF NOT EXISTS staffs (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT NOT NULL,
                email TEXT NOT NULL,
                "joinDate" TEXT NOT NULL,
                username TEXT NOT NULL,
                password TEXT NOT NULL
            )
        `)
        await client.query(`
            CREATE TABLE IF NOT EXISTS "shopSettings" (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                "shopName" TEXT NOT NULL,
                address TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL
            )
        `)

        // Ensure default admin exists
        const adminCheck = await client.query(
            'SELECT id FROM users WHERE username = $1 AND role = $2',
            [DEFAULT_ADMIN.username, 'admin']
        )
        if (adminCheck.rows.length === 0) {
            await client.query(
                'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
                [DEFAULT_ADMIN.username, hashPassword(DEFAULT_ADMIN.password), 'admin']
            )
        }

        console.log('DB initialized')
    } finally {
        client.release()
    }
}

// ─── REGISTER ────────────────────────────────────────────────────────────────

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, number, username, password } = req.body
        const normalizedUsername = username?.trim()?.toLowerCase()
        const normalizedEmail = email?.trim()?.toLowerCase()
        const role = 'user'

        if (!name || !normalizedEmail || !number || !normalizedUsername || !password) {
            return res.status(400).json({ message: 'All fields are required' })
        }
        if (normalizedUsername === DEFAULT_ADMIN.username) {
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

// ─── LOGIN ───────────────────────────────────────────────────────────────────

app.post('/api/login', async (req, res) => {
    try {
        const { username, password, role } = req.body
        const normalizedUsername = username?.trim()?.toLowerCase()

        if (!normalizedUsername || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' })
        }
        if (role !== 'admin' && role !== 'user') {
            return res.status(400).json({ message: 'Invalid role' })
        }
        if (role === 'admin' && normalizedUsername !== DEFAULT_ADMIN.username) {
            return res.status(401).json({ message: 'Only owner account can access admin login' })
        }

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

// ─── USERS ───────────────────────────────────────────────────────────────────

app.get('/api/users', async (_req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role FROM users ORDER BY id ASC')
        res.json({ users: result.rows })
    } catch (error) {
        console.error('Error fetching users:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

app.get('/api/products', async (_req, res) => {
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

app.post('/api/products', async (req, res) => {
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

app.put('/api/products/:id', async (req, res) => {
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

app.delete('/api/products/:id', async (req, res) => {
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

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────

app.get('/api/customers', async (_req, res) => {
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

app.post('/api/customers', async (req, res) => {
    try {
        const { name, orders, totalSpent } = req.body
        if (!name) return res.status(400).json({ message: 'Customer name is required' })
        const result = await pool.query(
            'INSERT INTO customers (name, orders, "totalSpent") VALUES ($1, $2, $3) RETURNING id',
            [name.trim(), parseNumber(orders), parseNumber(totalSpent)]
        )
        res.status(201).json({
            message: 'Customer created',
            customer: { id: result.rows[0].id, name: name.trim(), orders: parseNumber(orders), totalSpent: parseNumber(totalSpent) }
        })
    } catch (error) {
        console.error('Error creating customer:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.put('/api/customers/:id', async (req, res) => {
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

app.delete('/api/customers/:id', async (req, res) => {
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

// ─── ORDERS ──────────────────────────────────────────────────────────────────

app.get('/api/orders', async (_req, res) => {
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

app.post('/api/orders', async (req, res) => {
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
            order: { id: orderId, customer: customer.trim(), items: parseNumber(items), total: parseNumber(total), date, details, staffName: staffName || null }
        })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('Error creating order:', error)
        res.status(500).json({ message: 'Internal server error' })
    } finally {
        client.release()
    }
})

app.delete('/api/orders/:id', async (req, res) => {
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

// ─── STAFFS ──────────────────────────────────────────────────────────────────

app.get('/api/staffs', async (_req, res) => {
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

app.post('/api/staffs', async (req, res) => {
    try {
        const { name, email, joinDate, username, password, position } = req.body
        const normalizedUsername = username?.trim()?.toLowerCase()

        if (!name || !email || !joinDate || !normalizedUsername || !password) {
            return res.status(400).json({ message: 'All staff fields are required' })
        }
        if (normalizedUsername === DEFAULT_ADMIN.username) {
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

app.put('/api/staffs/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { name, email, joinDate, username, password, position } = req.body
        const normalizedUsername = username?.trim()?.toLowerCase()

        if (!name || !email || !joinDate || !normalizedUsername || !password) {
            return res.status(400).json({ message: 'All staff fields are required' })
        }
        if (normalizedUsername === DEFAULT_ADMIN.username) {
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

app.delete('/api/staffs/:id', async (req, res) => {
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

// ─── SHOP SETTINGS ───────────────────────────────────────────────────────────

app.get('/api/shop-settings', async (_req, res) => {
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

app.put('/api/shop-settings', async (req, res) => {
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

// ─── RESET ───────────────────────────────────────────────────────────────────

app.post('/api/reset', async (_req, res) => {
    try {
        await pool.query('DELETE FROM orders')
        await pool.query('DELETE FROM products')
        await pool.query('DELETE FROM customers')
        await pool.query('DELETE FROM staffs')
        await pool.query('DELETE FROM "shopSettings"')
        await pool.query("DELETE FROM users WHERE role = 'user'")
        await pool.query('DELETE FROM registrations')
        res.json({ message: 'System data reset complete' })
    } catch (error) {
        console.error('Error resetting system data:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

// ─── START ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000
initDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}).catch((err) => {
    console.error('Failed to initialize DB:', err)
    process.exit(1)
})