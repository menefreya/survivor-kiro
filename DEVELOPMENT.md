# Development Guide

## Code Quality

Since automated git hooks have been removed for deployment simplicity, please run these commands manually before committing:

### Before Committing

```bash
# Run all linting
npm run lint

# Run all tests
npm test

# Check CSS specificity (frontend only)
cd frontend && npm run test:css-specificity

# Check for legacy CSS issues (frontend only)
cd frontend && npm run legacy:check
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Run linting
npm run lint:all

# Fix CSS linting issues
npm run lint:css:fix

# Test production build
npm run build:prod
```

### Backend Development

```bash
cd backend

# Start development server
npm run dev

# Run tests
npm test

# Clean up test users (if needed)
npm run cleanup:test-users
```

## CSS Development

### Important Rules

- Always use design tokens from `02-tokens.css`
- Follow BEM naming convention
- Keep specificity under 0,0,3,0 (max 3 classes)
- Use utility classes for common patterns
- Test on mobile, tablet, and desktop

### CSS Tools

```bash
cd frontend

# Check CSS specificity
npm run test:css-specificity

# Monitor legacy CSS overrides
npm run legacy:check

# Generate legacy CSS report
npm run legacy:report
```

## Deployment

### Frontend
- Deploys automatically to Vercel on push
- Uses `npm run build:prod` (skips linting)
- Configured via `vercel.json` files

### Backend
- Manual deployment to your chosen platform
- Uses `npm start` to run
- Requires environment variables

## Troubleshooting

### Build Failures
1. Run `npm run deploy:check` to validate setup
2. Check that all dependencies are installed
3. Verify environment variables are set
4. Test builds locally first

### CSS Issues
1. Run CSS specificity audit
2. Check legacy CSS file for overrides
3. Validate design token usage
4. Test responsive breakpoints

### Linting Errors
1. Run `npm run lint` to see all issues
2. Fix errors manually (no auto-fix for deployment)
3. Use `npm run lint:css:fix` for CSS auto-fixes
4. Check component-specific linting rules

## Best Practices

- Test locally before pushing
- Keep commits focused and atomic
- Write descriptive commit messages
- Update documentation when needed
- Follow the established code patterns
- Use design tokens consistently
- Test accessibility features