# AgriYield — Combined Project

## Structure
```
AgriYieldCombined/
├── backend/    ← Node.js + Express + MongoDB
└── frontend/   ← React + Blockchain
```

## Setup & Run

### Step 1 — Backend (Terminal 1)
```
cd backend
npm install
node server.js
```
Runs on http://localhost:8082

### Step 2 — Blockchain (Terminal 2)
```
cd frontend
npm install
npm run chain
```

### Step 3 — Deploy contracts (Terminal 3)
```
cd frontend
npm run deploy
```
Copy printed addresses into frontend/src/config.json

### Step 4 — Start React app (Terminal 4)
```
cd frontend
npm start
```
Runs on http://localhost:3000

---

## How it works

### Vendor
1. Sign up as Vendor
2. Add/edit/delete crop listings (saved to MongoDB)
3. Connect MetaMask → finalize blockchain sales

### Customer
1. Sign up as Customer
2. Browse Vendor Listings (from MongoDB)
3. Switch to Blockchain NFTs → buy crops via MetaMask escrow

### Supply Chain
- Live status of all on-chain crops (Listed / In Escrow / Sold)

---
