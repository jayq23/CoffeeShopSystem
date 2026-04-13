const express = require('express')
const cors = require('cors')
const Database =  require('better-sqlite3')
const path = require('path')
const bcrypt = require('bcryptjs')

const app = express()
const db = new Database(path.join(__dirname, 'db.sqlite'))
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
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  'http://localhost:5174',
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
}))
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin === FRONTEND_ORIGIN) {
            callback(null, true)
            return
        }
        callback(new Error('Not allowed by CORS'))
    },
}))
app.use(express.json())

const parseNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const isBcryptHash = (value) => typeof value === 'string' && value.startsWith('$2')
const hashPassword = (plainTextPassword) => bcrypt.hashSync(plainTextPassword, BCRYPT_ROUNDS)
const ensureHashedPassword = (rawPassword) => {
    if (!rawPassword) {
        return ''
    }
    return isBcryptHash(rawPassword) ? rawPassword : hashPassword(rawPassword)
}

const todayIsoDate = () => new Date().toISOString().split('T')[0]

//TABLE CREATION

//login table
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL
);
`) 

//registration table
db.exec(`
CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    number TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL
);
`)

//Ensure the default admin always exists.
const adminExistsStmt = db.prepare('SELECT id FROM users WHERE username = ? AND role = ?')
const insertUserStmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')

if (!adminExistsStmt.get(DEFAULT_ADMIN.username, DEFAULT_ADMIN.role)) {
    insertUserStmt.run(DEFAULT_ADMIN.username, hashPassword(DEFAULT_ADMIN.password), DEFAULT_ADMIN.role)
}

// Migrate legacy plaintext passwords to bcrypt hashes.
const hashLegacyPasswords = () => {
    const tables = ['users', 'registrations', 'staffs']
    for (const tableName of tables) {
        const rows = db.prepare(`SELECT id, password FROM ${tableName}`).all()
        const updateStmt = db.prepare(`UPDATE ${tableName} SET password = ? WHERE id = ?`)
        for (const row of rows) {
            if (!isBcryptHash(row.password)) {
                updateStmt.run(hashPassword(row.password), row.id)
            }
        }
    }
}

//products table
db.exec(`
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    stock INTEGER NOT NULL,
    price INTEGER NOT NULL,
    sales INTEGER DEFAULT 0,
    category TEXT NOT NULL
);
`)

//customers table
db.exec(`
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    orders INTEGER DEFAULT 0,
    totalSpent INTEGER DEFAULT 0
);
`)

//orders table
db.exec(`
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT NOT NULL,
    items INTEGER NOT NULL,
    total INTEGER NOT NULL,
    date TEXT NOT NULL,
    details TEXT NOT NULL,
    staffName TEXT
);
`)

//staffs table
db.exec(`
CREATE TABLE IF NOT EXISTS staffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    email TEXT NOT NULL,
    joinDate TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL
);
`)

const ensureStaffForCashierStmt = db.prepare('SELECT id FROM staffs WHERE username = ?')
const insertStaffForCashierStmt = db.prepare('INSERT INTO staffs (name, position, email, joinDate, username, password) VALUES (?, ?, ?, ?, ?, ?)')

const ensureCashierStaffRecord = ({ username, password, name, email }) => {
    const normalizedUsername = username?.trim()?.toLowerCase()
    if (!normalizedUsername) {
        return
    }

    if (ensureStaffForCashierStmt.get(normalizedUsername)) {
        return
    }

    const safeName = name?.trim() || normalizedUsername
    const safeEmail = email?.trim()?.toLowerCase() || `${normalizedUsername}@cashier.local`
    insertStaffForCashierStmt.run(safeName, 'Cashier', safeEmail, todayIsoDate(), normalizedUsername, password)
}

// Backfill legacy cashier accounts that exist in users but are missing in staffs.
const missingCashierStaffRows = db.prepare(`
    SELECT u.username, u.password, r.name, r.email
    FROM users u
    LEFT JOIN staffs s ON s.username = u.username
    LEFT JOIN registrations r ON r.username = u.username
    WHERE u.role = 'user' AND s.id IS NULL
`).all()

for (const row of missingCashierStaffRows) {
    ensureCashierStaffRecord({
        username: row.username,
        password: row.password,
        name: row.name,
        email: row.email,
    })
}

//shop settings table
db.exec(`
CREATE TABLE IF NOT EXISTS shopSettings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    shopName TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL
);
`)

hashLegacyPasswords()


//Regisreration endpoint
app.post('/api/register', (req, res) => {
    try{
        const { name, email, number, username, password } = req.body;
        const normalizedUsername = username?.trim()?.toLowerCase();
        const normalizedEmail = email?.trim()?.toLowerCase();
        const role = 'user';
        
        if (!name || !normalizedEmail || !number || !normalizedUsername || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (normalizedUsername === DEFAULT_ADMIN.username) {
            return res.status(403).json({ message: 'Admin account is reserved for owner' });
        }

        const existingUserStmt = db.prepare('SELECT id FROM users WHERE username = ?')
        if (existingUserStmt.get(normalizedUsername)) {
            return res.status(409).json({ message: 'Username already exists' })
        }

        const existingRegStmt = db.prepare('SELECT id FROM registrations WHERE email = ?')
        if (existingRegStmt.get(normalizedEmail)) {
            return res.status(409).json({ message: 'Email already exists' })
        }

        const stmt = db.prepare('INSERT INTO registrations (name, email, number, username, password, role) VALUES (?, ?, ?, ?, ?, ?)');
        const hashedPassword = hashPassword(password)
        stmt.run(name, normalizedEmail, number, normalizedUsername, hashedPassword, role);

        // Keep login source in users table while preserving registration details separately.
        insertUserStmt.run(normalizedUsername, hashedPassword, role)
        ensureCashierStaffRecord({
            username: normalizedUsername,
            password: hashedPassword,
            name,
            email: normalizedEmail,
        })

        res.status(201).json({ message: 'Registration successful', user: { username: normalizedUsername, role } });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}) 

app.get('/api/users', (_req, res) => {
    try {
        const rows = db.prepare('SELECT id, username, role FROM users ORDER BY id ASC').all()
        res.json({ users: rows })
    } catch (error) {
        console.error('Error fetching users:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.get('/api/products', (_req, res) => {
    try {
        const rows = db.prepare('SELECT id, name, stock, price, sales, category FROM products ORDER BY id ASC').all()
        res.json({ products: rows })
    } catch (error) {
        console.error('Error fetching products:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.post('/api/products', (req, res) => {
    try {
        const { name, stock, price, category, sales } = req.body

        if (!name || !category) {
            return res.status(400).json({ message: 'Name and category are required' })
        }

        const stmt = db.prepare('INSERT INTO products (name, stock, price, sales, category) VALUES (?, ?, ?, ?, ?)')
        const result = stmt.run(name.trim(), parseNumber(stock), parseNumber(price), parseNumber(sales), category)

        res.status(201).json({
            message: 'Product created',
            product: { id: result.lastInsertRowid, name: name.trim(), stock: parseNumber(stock), price: parseNumber(price), sales: parseNumber(sales), category }
        })
    } catch (error) {
        console.error('Error creating product:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.put('/api/products/:id', (req, res) => {
    try {
        const { id } = req.params
        const { name, stock, price, category } = req.body

        if (!name || !category) {
            return res.status(400).json({ message: 'Name and category are required' })
        }

        const stmt = db.prepare('UPDATE products SET name = ?, stock = ?, price = ?, category = ? WHERE id = ?')
        const result = stmt.run(name.trim(), parseNumber(stock), parseNumber(price), category, id)
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Product not found' })
        }
        res.json({ message: 'Product updated' })
    } catch (error) {
        console.error('Error updating product:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.delete('/api/products/:id', (req, res) => {
    try {
        const { id } = req.params
        const stmt = db.prepare('DELETE FROM products WHERE id = ?')
        const result = stmt.run(id)
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Product not found' })
        }
        res.json({ message: 'Product deleted' })
    } catch (error) {
        console.error('Error deleting product:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.get('/api/customers', (_req, res) => {
    try {
        const rows = db.prepare('SELECT id, name, orders, totalSpent FROM customers ORDER BY id ASC').all()
        res.json({ customers: rows })
    } catch (error) {
        console.error('Error fetching customers:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.post('/api/customers', (req, res) => {
    try {
        const { name, orders, totalSpent } = req.body

        if (!name) {
            return res.status(400).json({ message: 'Customer name is required' })
        }

        const stmt = db.prepare('INSERT INTO customers (name, orders, totalSpent) VALUES (?, ?, ?)')
        const result = stmt.run(name.trim(), parseNumber(orders), parseNumber(totalSpent))

        res.status(201).json({
            message: 'Customer created',
            customer: { id: result.lastInsertRowid, name: name.trim(), orders: parseNumber(orders), totalSpent: parseNumber(totalSpent) }
        })
    } catch (error) {
        console.error('Error creating customer:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.put('/api/customers/:id', (req, res) => {
    try {
        const { id } = req.params
        const { name, orders, totalSpent } = req.body

        if (!name) {
            return res.status(400).json({ message: 'Customer name is required' })
        }

        const stmt = db.prepare('UPDATE customers SET name = ?, orders = ?, totalSpent = ? WHERE id = ?')
        const result = stmt.run(name.trim(), parseNumber(orders), parseNumber(totalSpent), id)
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Customer not found' })
        }
        res.json({ message: 'Customer updated' })
    } catch (error) {
        console.error('Error updating customer:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.delete('/api/customers/:id', (req, res) => {
    try {
        const { id } = req.params
        const stmt = db.prepare('DELETE FROM customers WHERE id = ?')
        const result = stmt.run(id)
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Customer not found' })
        }
        res.json({ message: 'Customer deleted' })
    } catch (error) {
        console.error('Error deleting customer:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.get('/api/orders', (_req, res) => {
    try {
        const rows = db.prepare('SELECT id, customer, items, total, date, details, staffName FROM orders ORDER BY id DESC').all()
        const mapped = rows.map((row) => ({ ...row, staff: row.staffName || '' }))
        res.json({ orders: mapped })
    } catch (error) {
        console.error('Error fetching orders:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.post('/api/orders', (req, res) => {
    try {
        const { customer, items, total, date, details, staffName } = req.body

        if (!customer || !details || !date) {
            return res.status(400).json({ message: 'Customer, date, and details are required' })
        }

        const stmt = db.prepare('INSERT INTO orders (customer, items, total, date, details, staffName) VALUES (?, ?, ?, ?, ?, ?)')
        const result = stmt.run(customer.trim(), parseNumber(items), parseNumber(total), date, details, staffName || null)

        res.status(201).json({
            message: 'Order created',
            order: {
                id: result.lastInsertRowid,
                customer: customer.trim(),
                items: parseNumber(items),
                total: parseNumber(total),
                date,
                details,
                staffName: staffName || null,
            }
        })
    } catch (error) {
        console.error('Error creating order:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.delete('/api/orders/:id', (req, res) => {
    try {
        const { id } = req.params
        const stmt = db.prepare('DELETE FROM orders WHERE id = ?')
        const result = stmt.run(id)
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Order not found' })
        }
        res.json({ message: 'Order deleted' })
    } catch (error) {
        console.error('Error deleting order:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.get('/api/staffs', (_req, res) => {
    try {
        const rows = db.prepare('SELECT id, name, position, email, joinDate, username FROM staffs ORDER BY id ASC').all()
        res.json({ staffs: rows })
    } catch (error) {
        console.error('Error fetching staffs:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.post('/api/staffs', (req, res) => {
    try {
        const { name, email, joinDate, username, password, position } = req.body
        const normalizedUsername = username?.trim()?.toLowerCase()

        if (!name || !email || !joinDate || !normalizedUsername || !password) {
            return res.status(400).json({ message: 'All staff fields are required' })
        }

        if (normalizedUsername === DEFAULT_ADMIN.username) {
            return res.status(403).json({ message: 'Admin account is reserved for owner' })
        }

        const userExistsStmt = db.prepare('SELECT id FROM users WHERE username = ?')
        if (userExistsStmt.get(normalizedUsername)) {
            return res.status(409).json({ message: 'Username already exists' })
        }

        const hashedPassword = hashPassword(password)
        const insertStaffStmt = db.prepare('INSERT INTO staffs (name, position, email, joinDate, username, password) VALUES (?, ?, ?, ?, ?, ?)')
        const result = insertStaffStmt.run(name.trim(), position || 'Cashier', email.trim(), joinDate, normalizedUsername, hashedPassword)
        insertUserStmt.run(normalizedUsername, hashedPassword, 'user')

        res.status(201).json({
            message: 'Staff created',
            staff: {
                id: result.lastInsertRowid,
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

app.put('/api/staffs/:id', (req, res) => {
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

        const currentStaffStmt = db.prepare('SELECT username FROM staffs WHERE id = ?')
        const currentStaff = currentStaffStmt.get(id)
        if (!currentStaff) {
            return res.status(404).json({ message: 'Staff not found' })
        }

        const userExistsStmt = db.prepare('SELECT id FROM users WHERE username = ? AND username != ?')
        if (userExistsStmt.get(normalizedUsername, currentStaff.username)) {
            return res.status(409).json({ message: 'Username already exists' })
        }

        const hashedPassword = ensureHashedPassword(password)
        const staffStmt = db.prepare('UPDATE staffs SET name = ?, position = ?, email = ?, joinDate = ?, username = ?, password = ? WHERE id = ?')
        staffStmt.run(name.trim(), position || 'Cashier', email.trim(), joinDate, normalizedUsername, hashedPassword, id)

        const updateUserStmt = db.prepare('UPDATE users SET username = ?, password = ? WHERE username = ? AND role = ?')
        updateUserStmt.run(normalizedUsername, hashedPassword, currentStaff.username, 'user')

        res.json({ message: 'Staff updated' })
    } catch (error) {
        console.error('Error updating staff:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.delete('/api/staffs/:id', (req, res) => {
    try {
        const { id } = req.params
        const staffStmt = db.prepare('SELECT username FROM staffs WHERE id = ?')
        const staff = staffStmt.get(id)
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' })
        }

        db.prepare('DELETE FROM staffs WHERE id = ?').run(id)
        db.prepare('DELETE FROM users WHERE username = ? AND role = ?').run(staff.username, 'user')
        res.json({ message: 'Staff deleted' })
    } catch (error) {
        console.error('Error deleting staff:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.get('/api/shop-settings', (_req, res) => {
    try {
        const row = db.prepare('SELECT shopName, address, phone, email FROM shopSettings WHERE id = 1').get()
        res.json({
            shopSettings: row || {
                shopName: '',
                address: '',
                phone: '',
                email: '',
            }
        })
    } catch (error) {
        console.error('Error fetching shop settings:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.put('/api/shop-settings', (req, res) => {
    try {
        const { shopName, address, phone, email } = req.body

        if (!shopName || !address || !phone || !email) {
            return res.status(400).json({ message: 'All shop settings fields are required' })
        }

        const upsertStmt = db.prepare(`
            INSERT INTO shopSettings (id, shopName, address, phone, email)
            VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                shopName = excluded.shopName,
                address = excluded.address,
                phone = excluded.phone,
                email = excluded.email
        `)
        upsertStmt.run(shopName.trim(), address.trim(), phone.trim(), email.trim())

        res.json({ message: 'Shop settings saved' })
    } catch (error) {
        console.error('Error saving shop settings:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.post('/api/reset', (_req, res) => {
    try {
        db.prepare('DELETE FROM orders').run()
        db.prepare('DELETE FROM products').run()
        db.prepare('DELETE FROM customers').run()
        db.prepare('DELETE FROM staffs').run()
        db.prepare('DELETE FROM shopSettings').run()
        db.prepare("DELETE FROM users WHERE role = 'user'").run()
        db.prepare('DELETE FROM registrations').run()
        res.json({ message: 'System data reset complete' })
    } catch (error) {
        console.error('Error resetting system data:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

 //Login endpoint
 app.post('/api/login', (req, res) => {
    try{
      const {username, password, role} = req.body;
            const normalizedUsername = username?.trim()?.toLowerCase();

            if (!normalizedUsername || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
      }

            if (role !== 'admin' && role !== 'user') {
                return res.status(400).json({ message: 'Invalid role' });
            }

            // Only the owner account can log in as admin.
            if (role === 'admin' && normalizedUsername !== DEFAULT_ADMIN.username) {
                return res.status(401).json({ message: 'Only owner account can access admin login' });
            }

    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?');
        const user = stmt.get(normalizedUsername, role);

    if (user && bcrypt.compareSync(password, user.password)) {
        res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
 })

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})