# 🛡️ Kashif Admin Panel

Complete Next.js admin panel for managing the Kashif platform.

## ✨ Features

### 📊 Dashboard
- System statistics overview
- Quick access to all management sections
- Real-time data from backend

### 👥 User Management
- View all registered users
- Search and filter users
- **Award points manually** to users
- View user statistics (points, role, status)
- User role management (USER/ADMIN)

### 📝 Report Management
- View and moderate all reports
- Filter by status (NEW, IN_PROGRESS, RESOLVED, REJECTED)
- **Update report status** with comments
- View report location and details
- Search reports by title/description

### 🎁 Coupon Management
- **Create new coupons** with all details
- **Create companies** for coupons
- **Create coupon categories**
- Manage expiration dates
- Set usage limits per user
- View all active/inactive coupons

### 🔔 Notification Management
- **Send manual push notifications** to specific users
- Customize notification title, body, and data
- Direct integration with Firebase Cloud Messaging

### 📈 Analytics
- **Top users leaderboard** by points
- Platform statistics
- Report resolution rates
- Coupon redemption statistics

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd admin
npm install --legacy-peer-deps
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to access the admin panel.

## 🔐 Admin Login

### Creating an Admin User

You need to create an admin user in the backend first. Connect to your backend database and run:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

### Login

1. Go to [http://localhost:3001](http://localhost:3001)
2. Enter your admin credentials
3. Only users with `role = 'ADMIN'` can access the panel

## 🌐 Backend Integration

All endpoints connect to: `http://38.127.216.236:8000/api/`

### Admin-Only Endpoints Used

- `POST /gamification/points/award` - Award points
- `PATCH /reports/{id}/status` - Update report status
- `POST /coupons/` - Create coupon
- `POST /coupons/companies` - Create company
- `POST /coupons/categories` - Create category
- `POST /notifications/send` - Send notification

## 📁 Project Structure

```
admin/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── page.tsx             # Dashboard home
│   │   ├── users/page.tsx       # User management
│   │   ├── reports/page.tsx     # Report management
│   │   ├── coupons/page.tsx     # Coupon management
│   │   ├── notifications/page.tsx # Notification sender
│   │   └── analytics/page.tsx   # Analytics & leaderboard
│   ├── login/page.tsx           # Admin login
│   └── page.tsx                 # Redirect to dashboard
├── lib/
│   ├── api.ts                   # API client
│   └── types.ts                 # TypeScript types
└── .env.local                   # Environment config
```

## 🛠️ Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons

---

**Built for Kashif Platform Management**
