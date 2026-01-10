# 🏷️ Trap Inventory Management System

Enterprise-grade inventory management solution for **Trap** - a premium luxury streetwear and apparel brand.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

## ✨ Features

- **📦 Inventory Management** - Real-time stock tracking with warehouse locations
- **🏷️ Product Catalog** - Manage products with brands, categories, sizes, and colors
- **📊 Barcode System** - Generate and scan Code128 barcodes for quick operations
- **🧾 Invoice Generation** - Create professional invoices with PDF export
- **📈 Analytics Dashboard** - Business insights with interactive charts
- **🔍 Advanced Filters** - Find products by status, brand, category, price range
- **👥 Role-Based Access** - Admin, Manager, and Employee roles

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | Django 5, Django REST Framework |
| Database | PostgreSQL (Supabase for production) |
| Animations | Framer Motion |
| Charts | Recharts |

## 📁 Project Structure

```
trap/
├── apps/
│   ├── frontend/          # Next.js application
│   └── backend/           # Django REST API
├── packages/
│   └── shared/            # Shared types & utilities
├── docker/                # Docker configuration
└── pnpm-workspace.yaml    # Monorepo config
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- pnpm 8+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd trap
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   cd apps/backend && pip install -r requirements.txt
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Setup database**
   ```bash
   pnpm db:migrate
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Django Admin: http://localhost:8000/admin

## 📖 Documentation

- [API Documentation](./docs/api.md)
- [Database Schema](./docs/schema.md)
- [Deployment Guide](./docs/deployment.md)

## 🔐 Environment Variables

See [.env.example](./.env.example) for all configuration options.

## 📄 License

Proprietary - All rights reserved by Trap.
