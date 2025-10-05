# Vercel Deployment Setup

## ✅ Fixed Issues
- Moved `vercel.json` to respective directories (frontend and backend)
- Each project now has its own configuration
- No more conflicting build commands

## 🚀 Deploy Backend (Do This First)

### 1. Push Changes
```bash
git commit -m "Fix Vercel configuration for separate deployments"
git push origin main
```

### 2. Create Backend Project on Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Select your `survivor-kiro` repository
4. Configure:
   - **Project Name**: `survivor-backend` (or any name you prefer)
   - **Root Directory**: Click "Edit" and select `backend` ⚠️ CRITICAL
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

### 3. Add Environment Variables (BEFORE deploying)

Click "Environment Variables" and add:

```
SUPABASE_URL=<your_supabase_url>
SUPABASE_KEY=<your_supabase_anon_key>
JWT_SECRET=<generate_random_string>
FRONTEND_URL=<your_frontend_vercel_url>
NODE_ENV=production
```

**Get Supabase credentials:**
- Go to https://supabase.com/dashboard
- Select your project → Settings → API
- Copy Project URL and anon/public key

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Deploy Backend

Click **"Deploy"** and wait for completion.

### 5. Copy Backend URL

After deployment, copy your backend URL (e.g., `https://survivor-backend.vercel.app`)

---

## 🎨 Update Frontend (Do This Second)

### 1. Go to Frontend Vercel Project

Go to your existing frontend project on Vercel.

### 2. Add Environment Variable

1. Go to **Settings** → **Environment Variables**
2. Add new variable:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-url.vercel.app/api`
   
   Replace `your-backend-url` with the actual backend URL from step 5 above.

### 3. Update Root Directory (if needed)

If your frontend isn't deploying correctly:
1. Go to **Settings** → **General**
2. Under **Root Directory**, click "Edit"
3. Select `frontend`
4. Save

### 4. Redeploy Frontend

1. Go to **Deployments** tab
2. Click "..." on the latest deployment
3. Click **"Redeploy"**

---

## ✅ Test Your Deployment

### Test Backend
```bash
curl https://your-backend-url.vercel.app/api/health
```

Should return:
```json
{"status":"ok","message":"Survivor Fantasy League API"}
```

### Test Frontend
1. Visit your frontend URL
2. Try to sign up or log in
3. Check browser console - should see no CORS or connection errors

---

## 🐛 Troubleshooting

### Backend Deploy Fails
- **Error**: "Cannot find module"
  - **Fix**: Make sure Root Directory is set to `backend`
  
- **Error**: "ENOENT: no such file or directory"
  - **Fix**: Verify `backend/vercel.json` exists and is committed

### Frontend Can't Connect to Backend
- **Error**: "ERR_CONNECTION_REFUSED"
  - **Fix**: Backend not deployed or `VITE_API_BASE_URL` not set
  
- **Error**: CORS errors
  - **Fix**: Set `FRONTEND_URL` in backend to match frontend URL exactly

### 401 Unauthorized Errors
- **Fix**: Check `JWT_SECRET` is set in backend environment variables

---

## 📝 Summary

You should now have:
- ✅ Backend deployed at: `https://survivor-backend.vercel.app`
- ✅ Frontend deployed at: `https://your-frontend.vercel.app`
- ✅ Frontend configured to talk to backend
- ✅ CORS properly configured
- ✅ All environment variables set

Your app should be fully functional in production!
