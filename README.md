# Manarah Port Authority Management System

An enterprise-grade, role-based Port Operations and Logistics Management System designed for Manarah Port. This application integrates a high-performance **Laravel 12** REST API with a modern **React 18 / Vite / TypeScript** frontend, offering real-time updates, dual-language support (English/Arabic), and specialized modules for every port operation role.

---

## 🏗️ Project Overview

The Manarah Port Management System automates and tracks vessel arrivals, berthing operations, cargo manifests, discharge requests, and wharf storage capacities. It supports five core user roles, each with custom dashboards and specialized actions:

### 👥 User Roles & Features

*   **🚢 Shipping Agent**:
    *   Submit and track Anchorage Requests and Arrival Notifications.
    *   Upload cargo manifests (XML/JSON) and track clearance progress.
    *   Monitor assigned vessel activities and request port clearances.
*   **👮 Port Officer**:
    *   Manage berthing allocations and real-time vessel traffic.
    *   Record operational event logs (pilots, tugboats, draft levels).
    *   Issue port clearances and view historical vessel logs.
*   **🏭 Wharf Manager**:
    *   Monitor cargo storage area capacities and wharf utilization rates.
    *   Review and approve cargo discharge requests.
    *   Track container distributions across various warehouses/yards.
*   **💼 Trader**:
    *   Submit requests for cargo discharging and container retrieval.
    *   Track container locations, clearance status, and delivery schedules.
*   **👔 Executive (Port Authority)**:
    *   Authorize critical anchorage and arrival approvals.
    *   Manage system users and registration requests.
    *   Review operational/financial analytics reports.
    *   Trigger emergency exit protocols and review auditable decision logs.

---

## 🛠️ Technology Stack

*   **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Radix UI Primitives, Lucide Icons, Axios, TanStack React Query, React Hook Form, Recharts.
*   **Backend**: Laravel 12, Laravel Sanctum (Bearer Token Auth), Spatie Laravel Permission (RBAC), Laravel Reverb (WebSocket server), Barryvdh DomPDF.
*   **Database**: SQLite (default/local) or MySQL.

---

## 📋 Prerequisites

Ensure your development environment meets the following requirements:
*   **PHP** `>= 8.2`
*   **Composer** `>= 2.0`
*   **Node.js** `>= 18.0` (with `npm`)
*   **SQLite** or **MySQL** database server

---

## 🚀 Setup & Installation Guide

Follow these steps to set up both the backend API and the frontend client.

### 1. Backend Configuration

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create your environment configuration file:
    ```bash
    copy .env.example .env
    # Or 'cp .env.example .env' on Unix-like systems
    ```

3.  Install composer dependencies:
    ```bash
    composer install
    ```

4.  Generate the application key:
    ```bash
    php artisan key:generate
    ```

5.  Configure your database:
    *   **SQLite (Default)**: Ensure your `.env` contains:
        ```env
        DB_CONNECTION=sqlite
        ```
        Then, create the database file (Laravel 12 will usually prompt to create it automatically, or you can create it manually):
        ```bash
        # On Windows (PowerShell)
        New-Item -ItemType File -Path database/database.sqlite -Force
        # On Unix/macOS
        touch database/database.sqlite
        ```
    *   **MySQL**: Create a database named `Manarah_DB` in your MySQL server, then update your `.env`:
        ```env
        DB_CONNECTION=mysql
        DB_HOST=127.0.0.1
        DB_PORT=3306
        DB_DATABASE=Manarah_DB
        DB_USERNAME=your_username
        DB_PASSWORD=your_password
        ```

6.  Run migrations and seed default database records (roles, permissions, test data, and default users):
    ```bash
    php artisan migrate --seed
    ```

7.  Run the backend development server and background workers:
    ```bash
    composer run dev
    ```
    > [!NOTE]
    > This command runs a concurrent process setup including the Laravel local server (`php artisan serve` on port `8000`), the database queue listener (`php artisan queue:listen`), and log tailing (`php artisan pail`).

8.  In a separate terminal window, start the WebSockets (Reverb) server to enable real-time notifications:
    ```bash
    php artisan reverb:start
    ```

---

### 2. Frontend Configuration

1.  Navigate back to the project root directory:
    ```bash
    cd ..
    ```

2.  Install npm packages:
    ```bash
    npm install
    ```

3.  Start the Vite dev server:
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to the local address displayed in your terminal (typically `http://localhost:5173`).

---

## 🔑 Default Seeded Accounts

The database seeder configures the following default users for testing. All accounts share the same default password:

🔒 **Password**: `password`

| Role | Email Address | Description |
| :--- | :--- | :--- |
| **Shipping Agent** | `agent@example.com` | Manages vessels, manifest files, and anchorage requests. |
| **Port Officer** | `officer@example.com` | Manages active vessels, logs operational tasks, and berthing. |
| **Wharf Manager** | `wharf@example.com` | Manages storage capacities and cargo discharge approvals. |
| **Trader** | `trader@example.com` | Manages cargo discharge applications and tracks containers. |
| **Executive** | `executive@example.com` | Accesses statistics, approves registration, and oversees operations. |

---

## 🌐 Features & Integration Notes

*   **Internationalization (i18n)**: Fully supports English (LTR) and Arabic (RTL). Toggle languages at the top navigation bar or under Account Settings.
*   **Real-time Operations**: Connected to Laravel Reverb. When a vessel arrives or status updates are processed, notifications will instantly dispatch to relevant dashboards.
*   **Signature Capture**: Includes an HTML5 Canvas signature pad under Account Settings and approval pages for authentic digital signing.
*   **Idle Timeout**: Logged-in users will automatically log out after 5 minutes of inactivity to protect sensitive port data.
