# Neutral Grounds — Coffee Shop POS System

A full-stack point-of-sale system for coffee shops with role-based access for admins and cashiers.

Live Demo: [your-live-link-here]

---

## Features

- Role-based login (Admin & Cashier)
- Product management with image upload (base64)
- Cart and order processing for cashiers
- Real-time stock validation and auto-decrement on checkout
- Automatic stock/sales reversal when orders are deleted
- Customer order history tracking
- Printable receipts
- Custom SVG-based sales trend chart
- Shop settings management (name, address, contact info)
- Backup/export system data as JSON

---

## Tech Stack

| Frontend | Backend | Database |
|----------|---------|----------|
| React, React Router | Node.js, Express.js | SQLite (better-sqlite3) |
| Lucide Icons | bcryptjs | |

---

## Security

- Bcrypt password hashing
- Legacy plaintext password migration
- Role-based access control (Admin / Cashier)
- Protected routes (frontend)

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/jayq23/CoffeeShopSystem

# Install backend dependencies
cd backend && npm install

# Run backend
npm start

# Install frontend dependencies (in a new terminal, from root)
npm install

# Run frontend
npm run dev
```