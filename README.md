# 💎 Avyanna Jewels — Luxury Jewelry Enterprise Management System (ERP)

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-v18.3-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-v8.0-47A248?logo=mongodb)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-gold.svg)]()

**Avyanna Jewels ERP** is a high-fidelity, secure, and intuitive enterprise resource planning and manufacturing execution system purpose-built for fine jewelry houses, bullion vaults, and haute joaillerie manufacturers. Built on the modern MERN stack with high-performance route code-splitting, panel-scoped suspense fallbacks, server-side data tables, and luxury brand design tokens.

---

## 📌 Project Details
- **Objective**: Build a world-class, responsive enterprise ERP tailored for luxury jewelry houses to streamline multi-vault bullion tracking, karigar manufacturing cycles, operational checklists, inter-branch city transit approvals, and executive accountability.
- **Key Modules (14 Active Workspaces)**:
  - Executive Operations Dashboard
  - Delegation Management with Approval Cycles
  - Operational Checklist (General Routine)
  - Account Checklist (Financial & Bank Compliance)
  - Help Tickets with SLA Tracking
  - Stock & Bullion Vault Management (`AV-STK-*` Barcodes)
  - City Transfer Approval (Inter-Branch Transit Pass)
  - Production FMS (7-Stage Karigar Manufacturing Pipeline)
  - Supplier FMS (Raw Bullion & Diamond Procurement)
  - Exhibition FMS & Pre-Exhibition FMS
  - Attendance & Biometrics Tracking
  - MIS Performance Scoring
  - System Masters (Users, Departments, Purity)
- **Design Philosophy**: Strict adherence to a luxury haute joaillerie design system (Cormorant Garamond serif headers, warm walnut canvas, polished gold accents `#dfb75c`, subtle micro-animations, and zero layout shift).
- **Tech Stack**:
  - **Frontend**: React 18 + Vite 5 + TanStack Query v5 + React Router DOM v6
  - **Styling**: Tailwind CSS (Luxury Palette: Gold, Walnut, Cream)
  - **Icons**: Lucide React
  - **Backend**: Node.js (ESM) + Express.js
  - **Database**: MongoDB Atlas (Cloud Cluster via Mongoose ODM)
  - **Security**: JWT Authentication, bcryptjs, Helmet headers, express-rate-limit

---

## ✨ Features
- **High-Fidelity Luxury UI**: Warm gold accents, elegant typography, glassmorphism card surfaces, and subtle micro-animations matching fine jewelry branding.
- **Zero-Flicker Panel Suspense**: Persistent left navigation sidebar and top header that never reload or unmount during page transitions; route suspense is strictly confined to the right-hand workspace.
- **Intent-Based Link Prefetching**: Route JavaScript chunks (~60–80 kB) preload on sidebar link hover/touch, allowing instantaneous transitions with zero skeleton latency.
- **Idle-Time Core Caching**: Background preloading of primary modules (`dashboard`, `checklist`, `delegation`, `stock-management`) during browser idle time using `requestIdleCallback`.
- **Vault & Karigar Bullion Accounting**: Real-time tracking of gross weights, net weights, diamond carats, stone pieces, and Karigar workshop metal loss reconciliations down to three decimal places (`0.001g`).
- **7-Stage Production FMS**: Interactive Kanban pipeline & tabular manufacturing ledger for jewelry jobs (CAD & 3D Wax, Tree Casting, Filing & Assembly, Diamond Setting, Polishing & Rhodium, QC & Hallmarking, Vault Inward).
- **Inter-Branch Transit Pass & Gate Security**: Multi-point custody approvals for jewelry transfers between retail showrooms, vaults, and exhibition stalls with gate verification.
- **Dual Compliance Checklists**: Recurring operational checklists and strict financial account reconciliations with repeat recurrence rules and proof attachment indicators.
- **Delegation Approval Cycles**: Hierarchical task assignment with `approval_waiting` states, revision tracking, and Managing Director (MD) follow-up threads.
- **Advanced Data Handling**: Server-side pagination (`10`, `20`, `50`, `100` rows), injection-safe dynamic column sorting (`SortableHeader`), and multi-field regex search.
- **Enterprise Security**: Role-based access control (Admin, Manager, Doer/Karigar) with automatic scoping, password encryption with bcryptjs, and rate-limiting on sensitive endpoints.

---

## 🏛️ Enterprise Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Vercel Frontend (React 18 + Vite)                    │
│                                                                        │
│   AppShell (Static Persistent Layout)                                  │
│   ├── Left Luxury Navigation Sidebar (AV Monogram)                     │
│   ├── Top Header & Breadcrumbs                                         │
│   └── Right Panel: <Suspense fallback={<ContentSkeleton />}>           │
│         └── <Outlet />  (Route-level lazy chunks)                      │
│                                                                        │
│   • Intent-Based Link Prefetching (onMouseEnter / onTouchStart)        │
│   • TanStack Query Cache (60s staleTime, 10m gcTime)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST (JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Render Backend (Node.js + Express)                   │
│                                                                        │
│   • Security: Helmet headers, rate-limiting, dynamic Vercel CORS       │
│   • Pipeline: Centralized errorHandler, Winston JSON, Morgan logger    │
│   • Core Services: BaseService (pagination, dynamic sort, regex search)│
│   • Authentication: JWT bearer tokens with role-based scoping          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Mongoose ODM / TLS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 MongoDB Atlas Cluster (Cloud Replica Set)              │
│                                                                        │
│   Collections: users, checklists, delegations, tickets, stocks,        │
│   supplierorders, productionjobs, citytransfers, counters              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Setup

```bash
# Clone the repository
git clone https://github.com/Kunalsahuji/Avyanna-Jewels-ERP.git
cd Avyanna-Jewels-ERP

# 1. Backend Setup
cd server
npm install
# Configure server/.env with MONGO_URI, JWT_SECRET, and CLIENT_URL
npm run seed     # Seeds Admin, Manager, and Employee accounts in MongoDB Atlas
npm run dev      # Starts Express server on http://localhost:5000

# 2. Frontend Setup (in a separate terminal)
cd ../client
npm install
npm run dev      # Starts Vite client on http://localhost:5173

# 3. Production Build
cd client
npm run build    # Compiles optimized production bundle
```

---

## 🔗 Live Implementation
- **Frontend (Vercel)**: [https://avyanna-jewels-erp.vercel.app](https://avyanna-jewels-erp.vercel.app)
- **Backend API (Render)**: [https://avyanna-jewels-erp.onrender.com](https://avyanna-jewels-erp.onrender.com)
- **Health Check**: [https://avyanna-jewels-erp.onrender.com/api/health](https://avyanna-jewels-erp.onrender.com/api/health)
- **GitHub Repository**: [Kunalsahuji/Avyanna-Jewels-ERP](https://github.com/Kunalsahuji/Avyanna-Jewels-ERP)

---

## 🤝 Connect with Me
📦 GitHub: [github.com/Kunalsahuji](https://github.com/Kunalsahuji)  
🔗 LinkedIn: [linkedin.com/in/kunalsahuji](https://www.linkedin.com/in/kunalsahuji)  
📌 Notion: [Watch my content](https://www.notion.so/1dff7c6ce1bb803787fbddd34e422ab4?v=1e0f7c6ce1bb8052b14c000cb57448ee&pvs=4)  
📧 Email: [ksahu0103@gmail.com](mailto:ksahu0103@gmail.com)  

---

## 🙌 Acknowledgements
Developed with ❤️ by [Kunal Sahu](https://github.com/Kunalsahuji).
