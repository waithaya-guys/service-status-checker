# Service Status Checker

A comprehensive service monitoring dashboard built with **Next.js 15** and **HeroUI v2**. This application monitors the status of your services in real-time, visualizes performance data, and manages incidents efficiently.

## ✨ Features

- **Real-Time Monitoring**: Automatically checks service health via HTTP/HTTPS, Ping, TCP, and Database connections.
- **Interactive Dashboard**:
  - **Status Overview**: Instant visual feedback on service health (UP, DEGRADED, DOWN).
  - **Latency Charts**: Historical latency trends with interactive tooltips.
  - **Mini Graphs**: Sparkline charts on service cards for quick trend analysis.
- **Admin Management**:
  - **Drag-and-Drop Ordering**: Easily reorder services on the dashboard.
  - **Service Configuration**: specialized settings for interval, timeout, and expected payloads.
  - **Incident Management**: Track outages, root causes, and resolution times.
- **Smart Notifications**:
  - **Responsive Toasts**: Alerts for service status changes (UP/DOWN) and system actions.
  - **Push Updates**: Auto-polling for real-time status updates without page refresh.
- **Robust Security**:
  - **Authentication**: Secure access via NextAuth.js.
  - **Data Privacy**: Automatic redaction of sensitive info (IPs, credentials) in logs.

## 🛠 Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [HeroUI v2](https://heroui.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Database/Storage**:
  - **PostgreSQL** (Primary Storage)
  - `pg` driver with connection pooling
  - Supports `oracledb` for Oracle Service checks
- **Visualization**: [Recharts](https://recharts.org/)
- **Utilities**: `dnd-kit` (Drag & Drop), `date-fns`, `concurrently`

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/service-status.git
    cd service-status
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment:
    Create a `.env` file based on `.env.example`:
    ```env
    NEXTAUTH_SECRET=your-secret-key
    NEXTAUTH_URL=http://localhost:3000
    DATABASE_URL=postgres://user:password@host:port/dbname?options=-c%20search_path%3Duat
    ```
    *Note: Append `?options=-c%20search_path%3Duat` to your connection string to use the correct schema.*

4.  **Database Setup**:
    Initialize the database schema and seed default data:
    ```bash
    # Create tables in 'uat' schema
    npx ts-node --project tsconfig.scripts.json scripts/init-db.ts

    # (Optional) Migrate existing JSON data to DB
    npx ts-node --project tsconfig.scripts.json scripts/seed-db.ts
    ```

### Running Locally

Start both the web application and the monitoring script concurrently:

```bash
npm run dev
```

- **Web App**: `http://localhost:3000`
- **Background Monitor**: Runs in the same terminal, checking services every `N` seconds.

### Building for Production

1.  Build the application:
    ```bash
    npm run build
    ```

2.  Start the production server:
    ```bash
    npm run start
    ```

### ⚙️ Configuration Notes

- **Schema**: The application uses the `uat` schema by default. Ensure your `DATABASE_URL` includes `?options=-c%20search_path%3Duat`.
- **SSL**: The application is configured to intelligently handle SSL. It disables SSL for `localhost` connections to avoid "server does not support SSL" errors during development, while enforcing it for production remote connections.


## 📖 User Guide

### 1. 📊 Dashboard Overview
- **Service Cards**: Displays the real-time status, uptime percentage, and a mini-graph of recent performance.
- **Status Indicators**:
  - 🟢 **UP**: Service is healthy and responding normally.
  - 🟡 **DEGRADED**: Service is slow (high latency) or experiencing minor issues.
  - 🔴 **DOWN**: Service is unreachable or has a critical failure.

### 2. 🛡️ Admin Actions
Access the admin panel at `/admin` (Default credentials should be configured in your `.env`).

#### Manage Services
- **Add Service**: Click the **"+ Add Service"** button. Choose the monitor type (HTTP, Ping, TCP, DB) and endpoint.
- **Edit Service**: Click the **Edit (✏️)** button on any table row.
- **Delete Service**: Click the **Delete (🗑️)** button. A confirmation modal will appear.
- **Reorder**: Drag the **Handle (⋮⋮)** on the left of any row to reorder how services appear on the main dashboard.

#### Manage Incidents
- Go to the **"Incidents"** tab.
- You can manually update the status or add a "Root Cause" explanation to active incidents.
- These updates are immediately reflected on the public dashboard to keep users informed.

## 📱 Mobile Support

- **Responsive Design**: Optimized for Desktop, Tablet, and Mobile.
- **Mobile-First UX**:
  - Scrollable tables and modals.
  - Adjusted toast positioning (Top-Center on mobile).
  - Touch-friendly controls.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
