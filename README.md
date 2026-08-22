# CPS Delivery App — Frontend

This is the frontend application for the CPS Delivery Service, providing role-based web interfaces for customers, dispatch operators, and delivery riders. 

Built with React, TypeScript, and Vite.

## 🚀 Features

- **Role-Based Access Control**: Different dashboards tailored to the user's role:
  - **Customers**: Request pickups (motorbike or van), view shipments, and track parcels.
  - **Operations/Dispatch**: Live operations board, fleet management (status, locations, vehicle filtering), and active job assignments.
  - **Riders/Couriers**: Mobile-first interface for viewing today's route, stops, and marking jobs as completed.
- **Modern UI Architecture**: 
  - Glassmorphism design system.
  - Smooth micro-animations.
  - Fully responsive, mobile-first pages tailored for on-the-go usage.
- **Client-Side Routing**: Powered by React Router v7 with protected routes.
- **Extensible CSS System**: Modular vanilla CSS using custom properties (`variables.css`), removing the need for heavy utility frameworks.

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Routing**: React Router DOM v7
- **Styling**: Vanilla CSS (Modular architecture)

## 📦 Integration & Setup Guide

To set up the development environment, follow these steps:

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### 2. Installation
Clone the repository and navigate to the frontend directory:

```bash
cd frontend
npm install
```

### 3. Local Development
Start the Vite development server:

```bash
npm run dev
```

The application will start at `http://localhost:5173`. 

### 4. Build for Production
To create a production build:

```bash
npm run build
```
The compiled assets will be placed in the `dist` directory, ready to be served.

## 📁 Folder Structure

```
frontend/
├── src/
│   ├── assets/          # Static assets (images, icons)
│   ├── components/      # Shared React components (Topbar, Footer, etc.)
│   ├── contexts/        # React Contexts (e.g., AuthContext)
│   ├── pages/           # Route-level components (Landing, LiveOpsBoard, etc.)
│   ├── styles/          # Modular CSS files (variables.css, layout.css, etc.)
│   ├── App.tsx          # Root router & route definitions
│   └── main.tsx         # Application entry point
├── package.json
└── vite.config.ts
```

## 🔐 Authentication (Current State)

The application currently uses a mocked `AuthContext` backed by `localStorage` for demonstration purposes. This enables you to test all role-based dashboards without a backend.

**To test different roles:**
1. Navigate to the **Sign Up** page.
2. Select your desired role (Customer, Operations, or Rider).
3. Complete the form to log in and view the customized dashboard.

*Note: In the next phase of integration, `AuthContext.tsx` should be updated to replace the mocked `localStorage` logic with actual API calls to your backend auth service.*
