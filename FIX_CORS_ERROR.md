# Fix CORS Error - Step by Step

## The Problem

Your backend is sending the wrong CORS header:
```
Access-Control-Allow-Origin: https://your-frontend-app.vercel.app
```

But your frontend is at:
```
https://survivor-kiro.vercel.app
```

## The Solution

Update the `FRONTEND_URL` environment variable in your backend Vercel project.

## Step-by-Step Instructions

### Step 1: Go to Backend Project Settings

1. Open https://vercel.com/dashboard
2. Find and click on your **backend** project (should be named something like `survivor-kiro-backend` or `survivor-backend`)
3. Click **Settings** (in the top navigation)
4. Click **Environment Variables** (in the left sidebar)

### Step 2: Find or Add FRONTEND_URL

Look for a variable named `FRONTEND_URL`:

**If it exists:**
1. Click the "..." menu next to it
2. Click "Edit"
3. Change the value to: `https://survivor-kiro.vercel.app`
4. Make sure it's set for all environments (Production, Preview, Development)
5. Click "Save"

**If it doesn't exist:**
1. Click "Add New" button
2. Enter:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://survivor-kiro.vercel.app`
3. Check all three environment checkboxes (Production, Preview, Development)
4. Click "Save"

### Step 3: Redeploy Backend

**IMPORTANT**: Environment variable changes don't take effect until you redeploy!

1. Click **Deployments** (in the top navigation)
2. Find the most recent deployment (should be at the top)
3. Click the "..." menu on the right side of that deployment
4. Click **"Redeploy"**
5. Confirm by clicking "Redeploy" again
6. Wait for the deployment to complete (usually 30-60 seconds)

### Step 4: Verify the Fix

After backend redeploys:

1. Go to your frontend: https://survivor-kiro.vercel.app
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to the Console tab
4. Clear any old errors
5. Try to log in or sign up
6. The CORS error should be gone!

## Alternative: Test with cURL

You can verify the CORS headers are correct:

```bash
curl -I -X OPTIONS \
  -H "Origin: https://survivor-kiro.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://survivor-kiro-backend.vercel.app/api/auth/login
```

Look for this header in the response:
```
Access-Control-Allow-Origin: https://survivor-kiro.vercel.app
```

If you see `https://your-frontend-app.vercel.app`, the backend hasn't been redeployed yet.

## Troubleshooting

### Still seeing CORS error after redeploying?

1. **Hard refresh your frontend**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Clear browser cache**: Sometimes old responses are cached
3. **Check you redeployed the backend**: Go to Deployments and verify the latest deployment finished
4. **Verify the environment variable**: Go back to Settings → Environment Variables and double-check the value

### Wrong project?

Make sure you're updating the **backend** project, not the frontend!
- Backend URL: `https://survivor-kiro-backend.vercel.app`
- Frontend URL: `https://survivor-kiro.vercel.app`

### Still not working?

As a temporary workaround, you can set CORS to allow all origins:

1. In backend environment variables, set `FRONTEND_URL` to: `*`
2. Redeploy backend
3. This allows all origins (less secure, but good for testing)

## After It Works

Once CORS is fixed, you should be able to:
- ✅ Sign up new users
- ✅ Log in existing users
- ✅ See the API Status indicator show "✅ Connected"
- ✅ No CORS errors in console

Your app will be fully functional! 🎉
