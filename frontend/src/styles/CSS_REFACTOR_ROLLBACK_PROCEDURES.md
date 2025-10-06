# CSS Refactor Rollback Procedures

This document provides step-by-step rollback procedures for the CSS architecture refactoring process.

## Emergency Rollback Commands

### Complete Rollback to Pre-Refactor State

If you need to completely rollback all CSS changes:

```bash
# Switch back to main branch
git checkout main

# Delete the refactor branch (if needed)
git branch -D css-refactor-foundation

# Reset any uncommitted changes
git reset --hard HEAD
git clean -fd
```

### Rollback to Specific Step

Each major step in the refactoring process is tagged for easy rollback:

```bash
# View available tags
git tag --list "css-refactor-step-*"

# Rollback to a specific step
git checkout css-refactor-step-1  # Foundation setup
git checkout css-refactor-step-2  # Component extraction
# etc.
```

## Step-by-Step Rollback Procedures

### Step 1: Foundation Setup Rollback

If issues occur after setting up the foundation:

```bash
# Remove new CSS files
rm -f frontend/src/styles/01-reset.css
rm -f frontend/src/styles/02-tokens.css
rm -f frontend/src/styles/03-base.css
rm -f frontend/src/styles/04-layout.css
rm -f frontend/src/styles/08-utilities.css
rm -f frontend/src/styles/09-legacy.css

# Remove new directories
rm -rf frontend/src/styles/05-components/
rm -rf frontend/src/styles/06-features/
rm -rf frontend/src/styles/07-pages/

# Restore original App.css imports (if modified)
git checkout HEAD -- frontend/src/App.css
```

### Step 2: Component Migration Rollback

If issues occur during component migration:

```bash
# Restore original component files
git checkout HEAD -- frontend/src/styles/buttons.css
git checkout HEAD -- frontend/src/styles/forms.css
git checkout HEAD -- frontend/src/styles/cards.css

# Remove any new component files
rm -f frontend/src/styles/05-components/*.css

# Restore original App.css
git checkout HEAD -- frontend/src/App.css
```

### Step 3: Inline Style Replacement Rollback

If issues occur during inline style replacement:

```bash
# Restore original JSX components
git checkout HEAD -- frontend/src/components/

# Remove utility classes from CSS
git checkout HEAD -- frontend/src/styles/08-utilities.css
```

## Pre-commit Hook Setup

To prevent CSS quality issues, set up pre-commit hooks:

```bash
# Install pre-commit (if not already installed)
npm install --save-dev stylelint stylelint-config-standard

# Create .stylelintrc.json
cat > .stylelintrc.json << 'EOF'
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "max-nesting-depth": 3,
    "selector-max-specificity": "0,3,0",
    "selector-max-id": 0,
    "declaration-no-important": [true, {
      "ignore": ["keyframes"]
    }],
    "custom-property-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"
  }
}
EOF

# Add to package.json scripts
npm pkg set scripts.lint:css="stylelint 'frontend/src/styles/**/*.css'"
npm pkg set scripts.lint:css:fix="stylelint 'frontend/src/styles/**/*.css' --fix"
```

## Visual Regression Testing Setup

Before each major step, capture baseline screenshots:

```bash
# Install visual testing tools (example with Playwright)
npm install --save-dev @playwright/test

# Create visual test script
mkdir -p frontend/tests/visual
cat > frontend/tests/visual/baseline.spec.js << 'EOF'
const { test, expect } = require('@playwright/test');

test('capture baseline screenshots', async ({ page }) => {
  // Navigate to each major page and capture screenshots
  await page.goto('http://localhost:5173');
  await expect(page).toHaveScreenshot('homepage.png');
  
  await page.goto('http://localhost:5173/profile');
  await expect(page).toHaveScreenshot('profile.png');
  
  await page.goto('http://localhost:5173/admin');
  await expect(page).toHaveScreenshot('admin.png');
});
EOF

# Run baseline capture
npm run test:visual -- --update-snapshots
```

## Monitoring and Validation

### CSS Bundle Size Monitoring

```bash
# Check CSS bundle size before changes
du -sh frontend/src/styles/

# After changes, compare
du -sh frontend/src/styles/
```

### Specificity Validation

```bash
# Install specificity checker
npm install --save-dev specificity

# Check specificity of all CSS files
npx specificity frontend/src/styles/**/*.css
```

### Performance Testing

```bash
# Run Lighthouse audit
npm install --save-dev lighthouse

# Audit performance
npx lighthouse http://localhost:5173 --only-categories=performance --output=json --output-path=./lighthouse-report.json
```

## Emergency Override System

If critical issues occur in production, use the legacy override system:

1. Add temporary fixes to `frontend/src/styles/09-legacy.css`
2. Document the override with TODO comments
3. Create tracking issue for proper fix
4. Set timeline for removal

Example:
```css
/* 09-legacy.css */
/* TODO: Fix button component specificity issue - Issue #123 */
/* Timeline: Remove by end of sprint */
.emergency-button-fix {
  background-color: var(--color-primary) !important;
}
```

## Recovery Checklist

When rolling back changes:

- [ ] Verify all pages load without errors
- [ ] Check that all interactive elements work
- [ ] Validate responsive design on mobile/tablet
- [ ] Test keyboard navigation
- [ ] Verify color contrast meets accessibility standards
- [ ] Run full test suite
- [ ] Check browser console for errors
- [ ] Validate with screen reader (if applicable)

## Contact Information

For CSS refactoring issues:
- Frontend Lead: [Contact Info]
- CSS Architecture: [Contact Info]
- Emergency Escalation: [Contact Info]

## Useful Commands Reference

```bash
# View current branch
git branch

# View commit history
git log --oneline

# View file changes
git diff HEAD~1 frontend/src/styles/

# Stash current changes
git stash

# Apply stashed changes
git stash pop

# View CSS file sizes
find frontend/src/styles -name "*.css" -exec wc -l {} + | sort -n

# Check for CSS syntax errors
npx stylelint "frontend/src/styles/**/*.css"
```