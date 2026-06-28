import 'dotenv/config';
import express from 'express';

console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME);
console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD);

import cors from 'cors';
import { initDB, pool } from './config/db.js';

// Import your route handlers using ES Modules syntax
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import orderRoutes from './routes/orders.js';
import staffRoutes from './routes/staffs.js';
import shopSettingsRoutes from './routes/shopSettings.js';

const app = express();

const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://neutral-grounds.vercel.app',
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
}));
app.use(express.json({ limit: '10mb' }));

// ─── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staffs', staffRoutes);
app.use('/api/shop-settings', shopSettingsRoutes);

// ─── RESET ───────────────────────────────────────────────────────────────────
app.post('/api/reset', async (_req, res) => {
    try {
        await pool.query('DELETE FROM orders');
        await pool.query('DELETE FROM products');
        await pool.query('DELETE FROM customers');
        await pool.query('DELETE FROM staffs');
        await pool.query('DELETE FROM "shopSettings"');
        await pool.query("DELETE FROM users WHERE role = 'user'");
        await pool.query('DELETE FROM registrations');
        res.json({ message: 'System data reset complete' });
    } catch (error) {
        console.error('Error resetting system data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ─── START ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
initDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((err) => {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
});