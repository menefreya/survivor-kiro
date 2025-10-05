# Deployment Checklist

## ✅ Pre-Deployment Steps Completed

- [x] Updated frontend to use environment variables for API URL
- [x] Updated backend CORS configuration
- [x] Created backend vercel.json configuration
- [x] Created environment variable examples

## 🚀 Next Steps - Deploy Backend to Vercel

### 1. Commit and Push Changes
```bash
git add .
git commit -m "Configure backend and frontend for production deployment"
git push origin main
```

### 2. Deploy Backend on Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select your `survivor-kiro` repository
4. Configure:
   - **Project Name**: `survivor-backend`
   - **Root Directory**: Select `backend` ⚠️ IMPORTANT
   - **Framework**: Other
5. Add Environment Variables (before deploying):
   ```
   SUPABASE_URL=<from your Supabase dashboard>
   SUPABASE_KEY=<from your Supabase dashboard>
   JWT_SECRET=<generate a random string>
   FRONTEND_URL=<your frontend Vercel URL>
   NODE_ENV=production
   ```
6. Click "Deploy"

### 3. Update Frontend Environment Variable

After backend is deployed:

1. Copy your backend URL (e.g., `https://survivor-backend.vercel.app`)
2. Go to your frontend Vercel project
3. Settings → Environment Variables
4. Add new variable:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-url.vercel.app/api`
5. Go to Deployments tab
6. Click "..." on latest deployment → "Redeploy"

### 4. Test Your Application

1. Visit your frontend URL
2. Try to sign up / log in
3. Check browser console for errors
4. Test API connection: `https://your-backend-url.vercel.app/api/health`

## 📝 Important Notes

### Get Supabase Credentials
1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_KEY`

### Generate JWT Secret
Run this command to generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Common Issues

**Problem**: "Failed to load resource: net::ERR_CONNECTION_REFUSED"
**Solution**: Backend not deployed or `VITE_API_BASE_URL` not set in frontend

**Problem**: CORS errors
**Solution**: Set `FRONTEND_URL` in backend to match your frontend URL exactly

**Problem**: 401 Unauthorized
**Solution**: Check `JWT_SECRET` is set in backend environment variables

## 🎯 Success Criteria

- [ ] Backend health check returns 200 OK
- [ ] Frontend can sign up new users
- [ ] Frontend can log in existing users
- [ ] No CORS errors in browser console
- [ ] API calls work from production frontend
