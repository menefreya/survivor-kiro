# Manual Testing Checklist - UX/UI Design Improvements

**Print this checklist and check off items as you test**

---

## Quick Reference: Testing URLs

- **Local Frontend:** http://localhost:5173
- **Local Backend:** http://localhost:3001

---

## 1. BROWSER COMPATIBILITY (Desktop)

### Chrome
- [ ] Login page renders correctly
- [ ] Signup page renders correctly  
- [ ] Home page renders correctly
- [ ] Profile page renders correctly
- [ ] Ranking page renders correctly
- [ ] Admin page renders correctly
- [ ] All buttons work
- [ ] All forms work
- [ ] Hover effects smooth

### Firefox
- [ ] Login page renders correctly
- [ ] Signup page renders correctly
- [ ] Home page renders correctly
- [ ] Profile page renders correctly
- [ ] Ranking page renders correctly
- [ ] Admin page renders correctly
- [ ] All buttons work
- [ ] All forms work
- [ ] Hover effects smooth

### Safari
- [ ] Login page renders correctly
- [ ] Signup page renders correctly
- [ ] Home page renders correctly
- [ ] Profile page renders correctly
- [ ] Ranking page renders correctly
- [ ] Admin page renders correctly
- [ ] All buttons work
- [ ] All forms work
- [ ] Hover effects smooth

### Edge
- [ ] Login page renders correctly
- [ ] Signup page renders correctly
- [ ] Home page renders correctly
- [ ] Profile page renders correctly
- [ ] Ranking page renders correctly
- [ ] Admin page renders correctly
- [ ] All buttons work
- [ ] All forms work
- [ ] Hover effects smooth

---

## 2. MOBILE BROWSER TESTING

### iOS Safari (iPhone)
- [ ] All pages load without errors
- [ ] Touch targets are easy to tap (44x44px)
- [ ] Text is readable (no zooming needed)
- [ ] No horizontal scrolling
- [ ] Forms are easy to fill
- [ ] Buttons respond to touch
- [ ] Layout stacks properly

### Chrome Mobile (Android)
- [ ] All pages load without errors
- [ ] Touch targets are easy to tap (44x44px)
- [ ] Text is readable (no zooming needed)
- [ ] No horizontal scrolling
- [ ] Forms are easy to fill
- [ ] Buttons respond to touch
- [ ] Layout stacks properly

---

## 3. RESPONSIVE BREAKPOINTS

Test at these exact widths using browser DevTools:

### 320px (iPhone SE)
- [ ] Home page: Content stacks, no overflow
- [ ] Profile page: Form is usable
- [ ] Ranking page: List is readable
- [ ] Admin page: Tables adapt
- [ ] All text is readable
- [ ] All buttons are tappable

### 375px (iPhone 12/13)
- [ ] Home page: Content stacks, no overflow
- [ ] Profile page: Form is usable
- [ ] Ranking page: List is readable
- [ ] Admin page: Tables adapt
- [ ] All text is readable
- [ ] All buttons are tappable

### 768px (iPad)
- [ ] Home page: Two columns work well
- [ ] Profile page: Form has good spacing
- [ ] Ranking page: List has good spacing
- [ ] Admin page: Tables are readable
- [ ] Layout uses space well

### 1024px (Desktop)
- [ ] Home page: Two columns balanced
- [ ] Profile page: Form well-proportioned
- [ ] Ranking page: List easy to scan
- [ ] Admin page: Tables display fully
- [ ] Layout is not too wide

### 1440px (Large Desktop)
- [ ] Home page: Content centered/constrained
- [ ] Profile page: Form doesn't stretch too wide
- [ ] Ranking page: List is readable
- [ ] Admin page: Tables well-formatted
- [ ] Layout maintains proportions

---

## 4. KEYBOARD NAVIGATION

**Instructions:** Use only Tab, Shift+Tab, Enter, Space, and Arrow keys

### All Pages
- [ ] Tab order is logical
- [ ] All buttons reachable
- [ ] All links reachable
- [ ] All form fields reachable
- [ ] Focus indicator clearly visible
- [ ] No keyboard traps
- [ ] Can navigate backwards with Shift+Tab

### Home Page
- [ ] Can tab through all cards
- [ ] Can activate all buttons
- [ ] Focus moves logically

### Profile Page
- [ ] Can tab through form fields
- [ ] Can submit with Enter
- [ ] Can activate buttons with Space/Enter
- [ ] File upload is accessible

### Ranking Page
- [ ] Can tab through ranking list
- [ ] Can submit with keyboard
- [ ] Dropdown is keyboard accessible

### Admin Page
- [ ] Can tab through all sections
- [ ] Can interact with all forms
- [ ] Can activate all buttons
- [ ] Tables are navigable

---

## 5. SCREEN READER TESTING

**Tool:** VoiceOver (Mac: Cmd+F5) or NVDA (Windows)

### Home Page
- [ ] Page title announced
- [ ] Section headings announced
- [ ] Card content readable
- [ ] Button purposes clear
- [ ] Loading states announced
- [ ] Empty states descriptive

### Profile Page
- [ ] Form labels announced
- [ ] Input types identified
- [ ] Error messages announced
- [ ] Success messages announced
- [ ] Button purposes clear

### Ranking Page
- [ ] Instructions clear
- [ ] List items announced
- [ ] Submit button purpose clear

### Admin Page
- [ ] Section headings announced
- [ ] Form labels announced
- [ ] Table structure clear
- [ ] Button purposes clear

---

## 6. COLOR CONTRAST CHECK

**Tool:** Use browser extension (e.g., "WCAG Color Contrast Checker")

### Text Contrast (Minimum 4.5:1)
- [ ] Primary text on white background
- [ ] Secondary text on white background
- [ ] White text on primary button
- [ ] White text on danger button
- [ ] White text on success button
- [ ] Link text on white background

### Interactive Elements (Minimum 3:1)
- [ ] Button borders
- [ ] Input borders
- [ ] Focus indicators
- [ ] Card borders

---

## 7. LOADING STATES

### Home Page
- [ ] Shows spinner on initial load
- [ ] Spinner uses primary color (orange)
- [ ] Loading text is clear
- [ ] Layout doesn't shift when loaded
- [ ] Spinner is centered

### Profile Page
- [ ] Button shows loading on submit
- [ ] Button is disabled during load
- [ ] Loading indicator visible
- [ ] Success message after load

### Ranking Page
- [ ] Shows spinner on initial load
- [ ] Submit button shows loading
- [ ] Success feedback after submit

### Admin Page
- [ ] Data sections show loading
- [ ] Form submissions show loading
- [ ] Loading states are consistent

---

## 8. EMPTY STATES

### Home Page - No Team
- [ ] Empty state displays
- [ ] Icon is visible
- [ ] Title is clear
- [ ] Description is helpful
- [ ] Call-to-action present (if applicable)

### Home Page - No Leaderboard
- [ ] Empty state displays
- [ ] Message is clear

### Ranking Page - No Contestants
- [ ] Empty state displays
- [ ] Message is helpful

### Admin Page - No Data
- [ ] Empty states for each section
- [ ] Messages are clear
- [ ] Call-to-action buttons present

---

## 9. FORM VALIDATION

### Profile Page
- [ ] Required fields show error when empty
- [ ] Email format validated
- [ ] Error messages clear and specific
- [ ] Error messages near fields
- [ ] Success message after save
- [ ] API errors show user-friendly messages

### Ranking Page
- [ ] Cannot submit incomplete ranking
- [ ] Duplicate rankings prevented
- [ ] Sole survivor validated
- [ ] Error messages clear
- [ ] Success feedback after submit

### Admin Page - Contestant Form
- [ ] Required fields validated
- [ ] Name length validated
- [ ] Error messages clear
- [ ] Success feedback after creation

### Admin Page - Score Entry
- [ ] Episode selection validated
- [ ] Score values validated
- [ ] Contestant selection validated
- [ ] Error messages clear
- [ ] Success feedback after entry

---

## 10. VISUAL CONSISTENCY

### Buttons Across All Pages
- [ ] Primary buttons identical
- [ ] Secondary buttons identical
- [ ] Danger buttons identical
- [ ] Link buttons identical
- [ ] Hover states consistent
- [ ] Focus states consistent
- [ ] Disabled states consistent
- [ ] Loading states consistent

### Typography Across All Pages
- [ ] Page titles same size/weight
- [ ] Section titles same size/weight
- [ ] Card titles same size/weight
- [ ] Body text same size/line-height
- [ ] Small text same size
- [ ] Hierarchy is clear

### Cards Across All Pages
- [ ] Border radius consistent (12px)
- [ ] Shadows consistent
- [ ] Padding consistent (24px)
- [ ] Hover effects consistent
- [ ] Border colors consistent

### Forms Across All Pages
- [ ] Input height consistent (44px min)
- [ ] Input padding consistent
- [ ] Border style consistent (2px)
- [ ] Border radius consistent (8px)
- [ ] Focus states consistent
- [ ] Label styling consistent
- [ ] Error styling consistent
- [ ] Success styling consistent

### Spacing Across All Pages
- [ ] Section margins consistent
- [ ] Card gaps consistent
- [ ] Form field spacing consistent
- [ ] Button spacing consistent
- [ ] Follows 8px grid

### Colors Across All Pages
- [ ] Primary color (orange) used consistently
- [ ] Success color (green) used consistently
- [ ] Danger color (red) used consistently
- [ ] Text colors consistent
- [ ] Background colors consistent
- [ ] Border colors consistent

---

## 11. DESIGN TOKEN VERIFICATION

### Check CSS Files
- [ ] Dashboard.css uses CSS variables
- [ ] Profile.css uses CSS variables
- [ ] Ranking.css uses CSS variables
- [ ] Admin.css uses CSS variables
- [ ] Auth.css uses CSS variables
- [ ] No hardcoded colors found
- [ ] No hardcoded spacing found
- [ ] No hardcoded font sizes found

---

## 12. PERFORMANCE

### Page Load Times
- [ ] Home page loads in < 3 seconds
- [ ] Profile page loads in < 3 seconds
- [ ] Ranking page loads in < 3 seconds
- [ ] Admin page loads in < 3 seconds

### Animation Smoothness
- [ ] Hover effects are smooth (no jank)
- [ ] Transitions are smooth
- [ ] Loading spinners are smooth
- [ ] No layout shifts during load

---

## 13. EDGE CASES

### Long Content
- [ ] Long names don't break layout
- [ ] Long text wraps properly
- [ ] Overflow is handled (ellipsis/scroll)

### No Data Scenarios
- [ ] Empty states display correctly
- [ ] No JavaScript errors
- [ ] Layout doesn't break

### Error Scenarios
- [ ] Network errors handled gracefully
- [ ] API errors show user-friendly messages
- [ ] User can retry after errors
- [ ] No console errors

---

## FINAL CHECKLIST

- [ ] All critical issues resolved
- [ ] All medium issues documented
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete
- [ ] Accessibility audit passed
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast verified
- [ ] Loading states work
- [ ] Empty states work
- [ ] Form validation works
- [ ] Visual consistency verified
- [ ] Design tokens used throughout
- [ ] Performance acceptable

---

## Notes & Issues

**Critical Issues:**


**Medium Issues:**


**Minor Issues:**


**Browser-Specific Notes:**


**Mobile-Specific Notes:**


**Accessibility Notes:**


---

**Tested By:** ___________________  
**Date:** ___________________  
**Time Spent:** ___________________  
**Overall Assessment:** ___________________
