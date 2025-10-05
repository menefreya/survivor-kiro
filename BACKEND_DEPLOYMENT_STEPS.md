# Backend Deployment - Step by Step

## Issue Found
Your backend deployment doesn't exist or failed. Let's fix it.

## Updated Files
- ✅ Created `backend/api/index.js` - Vercel serverless entry point
- ✅ Updated `backend/vercel.json` - Proper Vercel configuration
- ✅ Updated `backend/server.js` - Added root endpoint for testing

## Deploy Backend to Vercel

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Fix backend for Vercel serverless deployment"
git push origin main
```

### Step 2: Create Backend Project on Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Select your `survivor-kiro` repository
4. **IMPORTANT Configuration:**
   - **Project Name**: `survivor-backend` (or your choice)
   - **Root Directory**: Click "Edit" → Select `backend` ⚠️ CRITICAL!
   - **Framework Preset**: Other
   - Leave build/output commands empty

### Step 3: Add Environment Variables (BEFORE Deploying!)

Click "Environment Variables" and add these:

#### Required Variables:
```
SUPABASE_URL=<your_supabase_project_url>
SUPABASE_KEY=<your_supabase_anon_key>
JWT_SECRET=<random_string_here>
```

#### Optional but Recommended:
```
FRONTEND_URL=<your_frontend_vercel_url>
NODE_ENV=production
```

#### How to Get Values:

**SUPABASE_URL and SUPABASE_KEY:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click Settings (gear icon) → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_KEY`

**JWT_SECRET:**
Generate a random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use it as JWT_SECRET

**FRONTEND_URL:**
Your frontend Vercel URL (e.g., `https://survivor-kiro.vercel.app`)

### Step 4: Deploy

Click **"Deploy"** button and wait for deployment to complete.

### Step 5: Test Backend

After deployment completes, you'll get a URL like:
`https://survivor-backend-xyz123.vercel.app`

Test it:
```bash
# Test root endpoint
curl https://your-backend-url.vercel.app/

# Test health endpoint
curl https://your-backend-url.vercel.app/api/health
```

Both should return JSON with `"status": "ok"`

### Step 6: Update Frontend Environment Variable

1. Go to your **frontend** Vercel project
2. Settings → Environment Variables
3. Add or update:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-url.vercel.app/api`
   
   Replace `your-backend-url` with your actual backend URL!

4. Add for all environments (Production, Preview, Development)

### Step 7: Redeploy Frontend

1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"

## Troubleshooting

### Backend Deploy Fails

**Check Vercel Logs:**
1. Go to your backend project on Vercel
2. Click on the failed deployment
3. Check the build logs for errors

**Common Issues:**

1. **"Cannot find module"**
   - Root directory not set to `backend`
   - Fix: Settings → General → Root Directory → `backend`

2. **"Missing dependencies"**
   - package.json not found
   - Fix: Ensure root directory is `backend`

3. **Environment variables not set**
   - Deployment succeeds but API calls fail
   - Fix: Add all required environment variables

### Backend Returns 404

**Issue**: Vercel can't find your deployment
**Fix**: 
- Make sure deployment succeeded (check Vercel dashboard)
- Verify the URL is correct
- Check that root directory is set to `backend`

### CORS Errors

**Issue**: Frontend can connect but gets CORS errors
**Fix**: 
- Set `FRONTEND_URL` in backend environment variables
- Make sure it matches your frontend URL exactly (no trailing slash)

### Database Connection Errors

**Issue**: Backend works but can't connect to Supabase
**Fix**:
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check Supabase project is active
- Test credentials locally first

## Verification Checklist

- [ ] Backend deployed successfully on Vercel
- [ ] Root directory set to `backend`
- [ ] All environment variables added
- [ ] Root endpoint returns 200 OK: `curl https://your-backend-url.vercel.app/`
- [ ] Health endpoint returns 200 OK: `curl https://your-backend-url.vercel.app/api/health`
- [ ] Frontend environment variable `VITE_API_BASE_URL` set
- [ ] Frontend redeployed after setting variable
- [ ] Frontend can connect to backend (check API Status indicator)

## Next Steps After Backend Works

1. Test authentication: Try signing up/logging in
2. Remove API Status indicator from frontend (optional)
3. Test all features: ranking, draft, leaderboard
4. Monitor Vercel logs for any runtime errors

## Alternative: Deploy Backend to Render

If Vercel continues to have issues, consider deploying backend to Render.com:
- Better suited for Node.js backends
- Easier environment variable management
- Free tier available
- More straightforward deployment process

Let me know if you want instructions for Render deployment!
