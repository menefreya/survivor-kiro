# Backend Deployment Guide

## Deploy to Vercel

### Step 1: Push Changes to GitHub
```bash
git add .
git commit -m "Configure backend for Vercel deployment"
git push origin main
```

### Step 2: Create New Vercel Project for Backend

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository: `survivor-kiro`
4. Configure the project:
   - **Project Name**: `survivor-backend` (or your preferred name)
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

### Step 3: Add Environment Variables

In the Vercel project settings, add these environment variables:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_random_jwt_secret_string
FRONTEND_URL=https://your-frontend-app.vercel.app
NODE_ENV=production
```

**Important**: Get your Supabase credentials from:
- Go to your Supabase project dashboard
- Settings → API
- Copy the Project URL and anon/public key

**Generate JWT_SECRET**: Use a random string generator or run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Deploy

Click "Deploy" and wait for the deployment to complete.

### Step 5: Get Your Backend URL

After deployment, copy your backend URL (e.g., `https://survivor-backend.vercel.app`)

### Step 6: Update Frontend Environment Variable

Go to your frontend Vercel project:
1. Settings → Environment Variables
2. Add or update:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-url.vercel.app/api`
3. Redeploy the frontend

### Step 7: Update Backend CORS

Go back to backend Vercel project:
1. Settings → Environment Variables
2. Update `FRONTEND_URL` with your actual frontend URL
3. Redeploy if needed

## Testing

Test your backend API:
```bash
curl https://your-backend-url.vercel.app/api/health
```

Should return:
```json
{"status":"ok","message":"Survivor Fantasy League API"}
```

## Troubleshooting

### CORS Errors
- Make sure `FRONTEND_URL` in backend matches your frontend URL exactly
- Check that both projects are deployed and accessible

### Database Connection Issues
- Verify Supabase credentials are correct
- Check Supabase project is active and accessible

### 404 Errors
- Ensure root directory is set to `backend` in Vercel project settings
- Check that `vercel.json` is in the backend directory

### Authentication Issues
- Verify `JWT_SECRET` is set in backend environment variables
- Make sure it's a strong random string
