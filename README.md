# Survivor Fantasy League

A web application for running a fantasy league based on the Survivor reality show.

## Project Structure

```
/backend          - Express API server
/frontend         - React application (Vite)
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies (already done):
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (already done):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173`

## Technology Stack

- **Frontend**: React, React Router, Axios, Vite
- **Backend**: Node.js, Express, JWT, bcrypt
- **Database**: Supabase (PostgreSQL)

## Environment Variables

Required environment variables for backend (see `backend/.env.example`):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase API key
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Backend server port (default: 3001)
# survivor-kiro
