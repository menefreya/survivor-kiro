# Survivor Fantasy League

A web application for running a fantasy league based on the Survivor reality show.

## Project Structure

```
/backend          - Express API server
/frontend         - React application (Vite)
```

## Setup Instructions

### Initial Setup

1. Install root dependencies and set up git hooks:
   ```bash
   npm install
   npm run husky:install
   ```

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
- **CSS Architecture**: Cascade-first design system with design tokens and BEM naming

## CSS Architecture

This project uses a modern, maintainable CSS architecture based on cascade layers and design tokens:

### File Organization

```
frontend/src/styles/
├── 01-reset.css              # CSS reset and normalize
├── 02-tokens.css             # Design tokens (CSS variables)
├── 03-base.css               # Base element styles
├── 04-layout.css             # Layout utilities and grid
├── 05-components/            # Component-specific styles
├── 06-features/              # Feature-specific styles
├── 07-pages/                 # Page-specific styles
├── 08-utilities.css          # Utility classes
└── 09-legacy.css             # Temporary legacy overrides
```

### Key Principles

- **Cascade-first**: Import order in `App.css` must never be changed
- **Design tokens**: All colors, spacing, and typography use CSS custom properties
- **BEM naming**: Components use Block__Element--Modifier convention
- **Utility classes**: Prefixed with `u-` for common patterns
- **Low specificity**: Maximum 3 classes per selector (0,0,3,0)

### Development Guidelines

- Always use design tokens from `02-tokens.css`
- Follow BEM naming for component CSS
- Use utility classes for common layout patterns
- Keep component CSS files under 200 lines
- Run `npm run lint:css` before committing

For detailed guidelines, see `frontend/src/styles/` documentation files.

## Environment Variables

Required environment variables for backend (see `backend/.env.example`):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase API key
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Backend server port (default: 3001)
# survivor-kiro
# survivor-kiro
