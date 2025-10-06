# Deployment Guide

## Vercel Deployment

### Frontend Deployment

The frontend is configured to deploy automatically to Vercel when changes are pushed to the main branch.

#### Build Configuration

- **Build Command**: `npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install`
- **Root Directory**: `frontend`

#### Environment Variables

Set these in your Vercel dashboard:

```
VITE_API_URL=https://your-backend-url.com
```

### Backend Deployment

The backend can be deployed to various platforms. Here are the requirements:

#### Environment Variables

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
PORT=3001
NODE_ENV=production
```

#### Build Requirements

- Node.js 18+
- npm 8+
- No build step required (runs directly with `npm start`)

### Common Issues

#### Husky Installation Error

If you see `husky: command not found` during deployment:

- This is expected in production environments
- Husky is only needed for local development (git hooks)
- No action needed - deployment will continue

To set up Husky locally after cloning:
```bash
npm run husky:install
```

#### CSS Linting Failures

If CSS linting fails during build:

- Check the legacy CSS file: `frontend/src/styles/09-legacy.css`
- Ensure all overrides are properly documented
- Run `npm run legacy:check` locally to debug

#### Build Failures

If the build fails:

1. Run `npm run deploy:check` to validate configuration
2. Check that all required files exist
3. Ensure environment variables are set
4. Test the build locally with `npm run build`

### Pre-deployment Checklist

- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations applied (if any)
- [ ] CSS specificity audit passes

### Monitoring

After deployment:

- Check application logs for errors
- Verify API endpoints are responding
- Test critical user flows
- Monitor performance metrics

### Rollback Plan

If issues occur after deployment:

1. Revert to previous commit
2. Redeploy from stable branch
3. Check environment variables
4. Verify database connectivity