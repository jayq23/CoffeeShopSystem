import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

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
        const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || '').trim().toLowerCase()
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

        if (ADMIN_USERNAME && ADMIN_PASSWORD) {
            //  Removed the require statement from here
            const adminCheck = await client.query(
                'SELECT id FROM users WHERE username = $1 AND role = $2',
                [ADMIN_USERNAME, 'admin']
            )
            if (adminCheck.rows.length === 0) {
                await client.query(
                    'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
                    [ADMIN_USERNAME, bcrypt.hashSync(ADMIN_PASSWORD, 10), 'admin']
                )
            }
        }

        console.log('DB initialized')
    } finally {
        client.release()
    }
}

export { pool, initDB }