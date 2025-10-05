# Frontend 404 Error Fix

## The Problem

Your frontend is getting a 404 error because it's trying to connect to `localhost:3001` in production, which doesn't exist.

## The Solution

You need to set the `VITE_API_BASE_URL` environment variable in Vercel to point to your backend.

## Steps to Fix

### 1. Commit and Push Current Changes

```bash
git add .
git commit -m "Add better error handling and API status indicator"
git push origin main
```

### 2. Set Environment Variable in Vercel

1. Go to your **frontend** Vercel project
2. Click **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-url.vercel.app/api`
   
   ⚠️ **IMPORTANT**: Replace `your-backend-url` with your actual backend URL
   
   Example: If your backend is at `https://survivor-backend-abc123.vercel.app`, then set:
   ```
   VITE_API_BASE_URL=https://survivor-backend-abc123.vercel.app/api
   ```

4. Make sure to add it for **Production**, **Preview**, and **Development** environments

### 3. Redeploy Frontend

1. Go to **Deployments** tab
2. Click "..." on the latest deployment
3. Click **"Redeploy"**

### 4. Check the API Status Indicator

After redeployment:
1. Visit your frontend URL
2. Look at the bottom-right corner
3. You should see:
   - **API URL**: Your backend URL
   - **Status**: ✅ Connected

If you see ❌ Failed, then:
- Backend is not deployed or not accessible
- Environment variable is set incorrectly
- CORS is blocking the request

## Verify Backend is Running

Test your backend directly:
```bash
curl https://your-backend-url.vercel.app/api/health
```

Should return:
```json
{"status":"ok","message":"Survivor Fantasy League API"}
```

If this fails, your backend isn't deployed correctly.

## Common Issues

### Issue: Still seeing localhost:3001
**Solution**: Environment variable not set or frontend not redeployed after setting it

### Issue: CORS error
**Solution**: Set `FRONTEND_URL` in backend environment variables to match your frontend URL

### Issue: Backend returns 404
**Solution**: Backend not deployed or root directory not set to `backend`

## Remove API Status Indicator (After Fixing)

Once everything works, remove the debug indicator:

1. Open `frontend/src/App.jsx`
2. Remove the import: `import ApiStatus from './components/ApiStatus';`
3. Remove the component: `<ApiStatus />`
4. Commit and push

## Quick Checklist

- [ ] Backend deployed successfully
- [ ] Backend health check returns 200 OK
- [ ] `VITE_API_BASE_URL` set in frontend Vercel project
- [ ] Frontend redeployed after setting environment variable
- [ ] API Status indicator shows ✅ Connected
- [ ] Can sign up / log in successfully
- [ ] No errors in browser console
