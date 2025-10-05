# Testing Instructions - UX/UI Design Improvements

This guide provides step-by-step instructions for testing and validating the UX/UI design improvements.

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
2. **npm** (comes with Node.js)
3. **Modern Browsers:**
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)

### Optional Tools

1. **Lighthouse** (for automated accessibility audits)
   ```bash
   npm install -g lighthouse
   ```

2. **Browser Extensions:**
   - WCAG Color Contrast Checker
   - axe DevTools
   - WAVE Evaluation Tool

3. **Screen Readers:**
   - macOS: VoiceOver (built-in, Cmd+F5)
   - Windows: NVDA (free download)
   - iOS: VoiceOver (Settings > Accessibility)
   - Android: TalkBack (Settings > Accessibility)

---

## Quick Start

### 1. Start the Development Server

```bash
cd frontend
npm install
npm run dev
```

The application should now be running at `http://localhost:5173`

### 2. Start the Backend Server (if needed)

```bash
cd backend
npm install
npm run dev
```

The API should now be running at `http://localhost:3001`

---

## Automated Testing

### Design Token Verification

This script checks if CSS files are using design tokens instead of hardcoded values.

```bash
cd frontend
node verify-design-tokens.js
```

**Expected Output:**
- List of CSS files checked
- Number of issues found per file
- Verification that required tokens exist

**What to Look For:**
- Files with many hardcoded values (especially Auth.css)
- Missing design tokens
- Inconsistent usage patterns

### Lighthouse Accessibility Audit

This script runs automated accessibility audits on all pages.

**Prerequisites:**
- Frontend dev server must be running
- Lighthouse must be installed globally

```bash
# Install Lighthouse (one-time)
npm install -g lighthouse

# Start dev server in one terminal
cd frontend
npm run dev

# Run audits in another terminal
cd frontend
node run-lighthouse-audit.js
```

**Expected Output:**
- Accessibility scores for each page (0-100)
- HTML and JSON reports in `frontend/lighthouse-reports/`
- Summary of results

**What to Look For:**
- Scores below 90 (need improvement)
- Critical accessibility issues
- Missing ARIA labels
- Color contrast failures

**View Reports:**
```bash
# Open reports in browser
open lighthouse-reports/login-report.html
open lighthouse-reports/home-report.html
# etc.
```

---

## Manual Testing

### Interactive Accessibility Checklist

Open the interactive checklist in your browser:

```bash
cd frontend
open accessibility-audit-checklist.html
```

Or navigate to: `file:///path/to/frontend/accessibility-audit-checklist.html`

**Features:**
- Interactive checkboxes for each test
- Progress tracking
- Auto-save to localStorage
- Printable report
- Color contrast samples
- Keyboard navigation test area

**How to Use:**
1. Enter your name at the top
2. Work through each section
3. Check off items as you complete them
4. Add notes in the text areas
5. Print or save the report when done

### Comprehensive Testing Checklist

Use the detailed checklist for thorough testing:

```bash
cd frontend
open MANUAL_TESTING_CHECKLIST.md
```

Or print it out for offline use.

**Sections:**
1. Browser Compatibility (Desktop)
2. Mobile Browser Testing
3. Responsive Breakpoints
4. Keyboard Navigation
5. Screen Reader Testing
6. Color Contrast Check
7. Loading States
8. Empty States
9. Form Validation
10. Visual Consistency
11. Design Token Verification
12. Performance
13. Edge Cases

---

## Step-by-Step Testing Guide

### Phase 1: Automated Tests (30 minutes)

1. **Run Design Token Verification**
   ```bash
   cd frontend
   node verify-design-tokens.js
   ```
   - Review output
   - Note files with issues
   - Document in test-validation-report.md

2. **Run Lighthouse Audits**
   ```bash
   # Ensure dev server is running
   node run-lighthouse-audit.js
   ```
   - Review accessibility scores
   - Open HTML reports
   - Document critical issues
   - Note pages below 90 score

### Phase 2: Browser Compatibility (2-3 hours)

1. **Chrome Testing**
   - Open http://localhost:5173
   - Test all pages (Login, Signup, Home, Profile, Ranking, Admin)
   - Check buttons, forms, cards, typography
   - Document issues in checklist

2. **Firefox Testing**
   - Repeat Chrome tests
   - Note any rendering differences
   - Check for Firefox-specific issues

3. **Safari Testing**
   - Repeat Chrome tests
   - Pay attention to form inputs (Safari can be quirky)
   - Check shadow rendering

4. **Edge Testing**
   - Repeat Chrome tests
   - Should be similar to Chrome (both Chromium-based)

### Phase 3: Mobile Testing (1-2 hours)

1. **Using Browser DevTools**
   - Open Chrome DevTools (F12)
   - Click "Toggle Device Toolbar" (Ctrl+Shift+M)
   - Test at these widths:
     - 320px (iPhone SE)
     - 375px (iPhone 12/13)
     - 768px (iPad)
     - 1024px (Desktop)
     - 1440px (Large Desktop)

2. **On Physical Devices (Recommended)**
   - iPhone: Test in Safari
   - Android: Test in Chrome
   - Check touch targets (should be easy to tap)
   - Verify text is readable without zooming
   - Ensure no horizontal scrolling

### Phase 4: Keyboard Navigation (30 minutes)

1. **Test Tab Order**
   - Start at top of page
   - Press Tab repeatedly
   - Verify logical order
   - Check focus indicators are visible

2. **Test Keyboard Shortcuts**
   - Enter: Submit forms, activate buttons
   - Space: Activate buttons
   - Escape: Close modals/dropdowns
   - Arrow keys: Navigate lists/dropdowns

3. **Test on Each Page**
   - Login page
   - Signup page
   - Home page
   - Profile page
   - Ranking page
   - Admin page

### Phase 5: Screen Reader Testing (1-2 hours)

1. **Enable Screen Reader**
   - macOS: Cmd+F5 (VoiceOver)
   - Windows: Start NVDA

2. **Test Each Page**
   - Listen to page title
   - Navigate by headings (H key in NVDA)
   - Navigate by forms (F key in NVDA)
   - Navigate by buttons (B key in NVDA)
   - Verify all content is announced

3. **Test Interactions**
   - Fill out forms
   - Submit forms
   - Listen for error messages
   - Listen for success messages
   - Verify loading states are announced

### Phase 6: Color Contrast (30 minutes)

1. **Install Browser Extension**
   - Chrome: "WCAG Color Contrast Checker"
   - Firefox: "WCAG Contrast Checker"

2. **Check Each Combination**
   - Primary text on white
   - Secondary text on white
   - White text on primary button
   - White text on danger button
   - White text on success button
   - Link text on white
   - Focus indicators

3. **Document Ratios**
   - Must be ≥ 4.5:1 for normal text
   - Must be ≥ 3:1 for large text and UI components
   - Record actual ratios in checklist

### Phase 7: Loading & Empty States (30 minutes)

1. **Test Loading States**
   - Slow down network in DevTools (Network tab > Throttling)
   - Reload pages to see loading spinners
   - Submit forms to see button loading states
   - Verify spinners use primary color
   - Verify layout doesn't shift

2. **Test Empty States**
   - Create scenarios with no data:
     - New user with no team
     - No contestants in system
     - No players in leaderboard
   - Verify empty state messages display
   - Check icons, titles, descriptions
   - Verify call-to-action buttons

### Phase 8: Form Validation (30 minutes)

1. **Test Profile Form**
   - Submit with empty fields
   - Submit with invalid email
   - Submit with valid data
   - Verify error messages
   - Verify success messages

2. **Test Ranking Form**
   - Try to submit incomplete ranking
   - Try to submit duplicate rankings
   - Submit valid ranking
   - Verify validation messages

3. **Test Admin Forms**
   - Test contestant creation
   - Test score entry
   - Verify all validation works
   - Check error handling

### Phase 9: Visual Consistency (1 hour)

1. **Compare Buttons Across Pages**
   - Take screenshots of primary buttons
   - Compare size, color, padding, border-radius
   - Verify hover states are identical
   - Check focus states

2. **Compare Typography**
   - Check page titles on all pages
   - Check section titles
   - Check body text
   - Verify hierarchy is consistent

3. **Compare Cards**
   - Check border-radius
   - Check shadows
   - Check padding
   - Check hover effects

4. **Compare Forms**
   - Check input heights
   - Check input padding
   - Check border styles
   - Check focus states

### Phase 10: Performance (30 minutes)

1. **Measure Load Times**
   - Open DevTools Network tab
   - Reload each page
   - Record load time
   - Should be < 3 seconds

2. **Check Animation Performance**
   - Open DevTools Performance tab
   - Record while hovering over buttons
   - Check for 60fps
   - Look for jank or stuttering

---

## Reporting Issues

### Issue Template

When you find an issue, document it with:

1. **Severity:** Critical / Medium / Minor
2. **Page:** Which page has the issue
3. **Browser:** Which browser (if browser-specific)
4. **Description:** What's wrong
5. **Steps to Reproduce:** How to see the issue
6. **Expected:** What should happen
7. **Actual:** What actually happens
8. **Screenshot:** If applicable

### Example Issue

```
Severity: Critical
Page: Login
Browser: Safari
Description: Focus indicator not visible on submit button
Steps to Reproduce:
  1. Open login page in Safari
  2. Press Tab until submit button is focused
  3. Observe focus indicator
Expected: Clear outline around button
Actual: No visible focus indicator
Screenshot: [attach screenshot]
```

### Where to Document

Add issues to:
- `frontend/test-validation-report.md` (detailed tracking)
- `frontend/MANUAL_TESTING_CHECKLIST.md` (quick notes)
- GitHub Issues (if using issue tracker)

---

## Completion Criteria

### Must Complete

- [ ] All automated tests run
- [ ] Lighthouse scores documented
- [ ] All browsers tested
- [ ] Mobile testing complete
- [ ] Keyboard navigation verified
- [ ] Color contrast verified
- [ ] Loading states verified
- [ ] Empty states verified
- [ ] Form validation verified
- [ ] Visual consistency verified

### Should Complete

- [ ] Screen reader testing done
- [ ] Physical device testing done
- [ ] Performance metrics recorded
- [ ] All issues documented
- [ ] Critical issues fixed

### Nice to Have

- [ ] High contrast mode tested
- [ ] Reduced motion tested
- [ ] Multiple screen readers tested
- [ ] Tablet-specific testing

---

## Getting Help

### Common Issues

**Issue:** Dev server won't start
**Solution:** 
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Issue:** Lighthouse fails to run
**Solution:**
```bash
npm install -g lighthouse
# Make sure dev server is running
# Try running lighthouse directly:
lighthouse http://localhost:5173 --only-categories=accessibility
```

**Issue:** Can't test on Safari
**Solution:** Safari is only available on macOS. If you don't have a Mac, skip Safari testing or use BrowserStack.

**Issue:** Screen reader is confusing
**Solution:** Start with the interactive checklist (accessibility-audit-checklist.html) which has a test area. Practice there first.

### Resources

- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **Lighthouse Docs:** https://developers.google.com/web/tools/lighthouse
- **VoiceOver Guide:** https://support.apple.com/guide/voiceover/welcome/mac
- **NVDA Guide:** https://www.nvaccess.org/files/nvda/documentation/userGuide.html
- **Color Contrast Checker:** https://webaim.org/resources/contrastchecker/

---

## Final Steps

### After Testing

1. **Review All Checklists**
   - Ensure all items checked
   - Review notes and issues
   - Prioritize issues by severity

2. **Update Documentation**
   - Fill out test-validation-report.md
   - Update TESTING_SUMMARY.md
   - Document any blockers

3. **Create Issue List**
   - List all critical issues
   - List all medium issues
   - Note minor issues for future

4. **Get Sign-Off**
   - Review with team
   - Get approval to proceed
   - Or create fix plan for issues

### Deliverables

- [ ] Completed test-validation-report.md
- [ ] Lighthouse reports in lighthouse-reports/
- [ ] Design token verification results
- [ ] Issue list with priorities
- [ ] Screenshots of key pages
- [ ] Sign-off from stakeholders

---

## Questions?

If you have questions about testing:
1. Review the TESTING_SUMMARY.md document
2. Check the requirements.md and design.md files
3. Consult with the development team

---

**Good luck with testing! 🚀**
