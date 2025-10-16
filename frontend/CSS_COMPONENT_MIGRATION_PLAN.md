# CSS Component Migration Task Plan

## 🎯 **Objective**
Migrate React components from legacy CSS classes to the new modular component system while maintaining all functionality and visual consistency.

## 📊 **Current Status**
- ✅ New CSS component system created and tested
- ✅ Legacy compatibility layer in place
- ✅ All existing functionality preserved
- 🔄 Ready to begin React component migration

## 🗂️ **Task Breakdown**

### **Phase 1: Core Entity Components (High Impact)**

#### **Task 1.1: Migrate PlayerRow.jsx**
**Priority**: Critical | **Effort**: Medium | **Impact**: High

**Current Classes → New Classes:**
```jsx
// OLD
<div className="player-row expandable">
  <div className="rank-badge rank-badge-gold">1</div>
  <div className="player-avatar">
    <div className="avatar-initial">JD</div>
  </div>
  <div className="player-info">
    <h3 className="player-name">John Doe</h3>
    <p className="player-username">@johndoe</p>
  </div>
  <div className="player-score">
    <div className="score-value">150</div>
    <div className="score-label">pts</div>
  </div>
</div>

// NEW
<div className="entity-row entity-row--interactive">
  <div className="entity-row__badge">
    <div className="badge badge--md badge--rank-gold">1</div>
  </div>
  <div className="entity-row__avatar">
    <div className="avatar avatar--lg">
      <div className="avatar__initials">JD</div>
    </div>
  </div>
  <div className="entity-row__info">
    <h3 className="entity-row__name">John Doe</h3>
    <p className="entity-row__subtitle">@johndoe</p>
  </div>
  <div className="entity-row__stats">
    <div className="entity-row__score">150</div>
    <div className="entity-row__score-label">pts</div>
  </div>
</div>
```

**Sub-tasks:**
- [ ] 1.1.1 Update rank badge classes and logic
- [ ] 1.1.2 Update avatar structure and classes
- [ ] 1.1.3 Update player info section classes
- [ ] 1.1.4 Update score display classes
- [ ] 1.1.5 Update expandable/interactive states
- [ ] 1.1.6 Test hover and click interactions
- [ ] 1.1.7 Verify accessibility attributes work

**Files to modify:**
- `frontend/src/components/PlayerRow.jsx`

**Testing checklist:**
- [ ] Rank badges display correct colors (gold, silver, bronze, default)
- [ ] Avatar images and initials display correctly
- [ ] Hover effects work properly
- [ ] Click to expand functionality works
- [ ] Current user highlighting works
- [ ] Mobile responsive behavior maintained

---

#### **Task 1.2: Migrate ContestantRow.jsx**
**Priority**: High | **Effort**: Medium | **Impact**: High

**Current Classes → New Classes:**
```jsx
// OLD
<div className="contestant-row">
  <div className="contestant-avatar">
    <div className="contestant-initials">AB</div>
  </div>
  <div className="contestant-info">
    <h4 className="contestant-name">Alice Brown</h4>
    <p className="contestant-profession">Teacher</p>
  </div>
  <div className="contestant-score">125</div>
</div>

// NEW
<div className="entity-row">
  <div className="entity-row__avatar">
    <div className="avatar avatar--lg">
      <div className="avatar__initials">AB</div>
    </div>
  </div>
  <div className="entity-row__info">
    <h4 className="entity-row__name">Alice Brown</h4>
    <p className="entity-row__subtitle">Teacher</p>
  </div>
  <div className="entity-row__stats">
    <div className="entity-row__score">125</div>
  </div>
</div>
```

**Sub-tasks:**
- [ ] 1.2.1 Update contestant avatar classes
- [ ] 1.2.2 Update contestant info section
- [ ] 1.2.3 Update score display
- [ ] 1.2.4 Update status badges (active/eliminated)
- [ ] 1.2.5 Test tribe badge integration

**Files to modify:**
- `frontend/src/components/ContestantRow.jsx`

---

### **Phase 2: Card Components (Medium Impact)**

#### **Task 2.1: Migrate LeaderboardCard.jsx**
**Priority**: High | **Effort**: Small | **Impact**: Medium

**Current Classes → New Classes:**
```jsx
// OLD
<div className="card leaderboard-card">
  <div className="card-header">
    <h2>Leaderboard</h2>
  </div>
  <div className="card-body">
    {/* content */}
  </div>
  <div className="card-footer">
    {/* footer content */}
  </div>
</div>

// NEW
<div className="card">
  <div className="layout-section-header">
    <h2 className="layout-section-header__title">Leaderboard</h2>
  </div>
  <div className="card-body">
    {/* content */}
  </div>
  <div className="card-footer">
    {/* footer content */}
  </div>
</div>
```

**Sub-tasks:**
- [ ] 2.1.1 Update card header structure
- [ ] 2.1.2 Verify card body content works
- [ ] 2.1.3 Update footer stats display
- [ ] 2.1.4 Test error states
- [ ] 2.1.5 Test empty states

**Files to modify:**
- `frontend/src/components/LeaderboardCard.jsx`

---

#### **Task 2.2: Migrate MyTeamCard.jsx**
**Priority**: High | **Effort**: Medium | **Impact**: Medium

**Current Classes → New Classes:**
```jsx
// OLD
<div className="card my-team-card">
  <div className="card-header">
    <h2>My Team</h2>
    <div className="team-total-score">
      <span className="total-score-value">150</span>
      <span className="total-score-label">pts</span>
    </div>
  </div>
</div>

// NEW
<div className="card">
  <div className="layout-section-header">
    <h2 className="layout-section-header__title">My Team</h2>
    <div className="layout-section-header__actions">
      <div className="team-total-score">
        <span className="total-score-value">150</span>
        <span className="total-score-label">pts</span>
      </div>
    </div>
  </div>
</div>
```

**Sub-tasks:**
- [ ] 2.2.1 Update card header with score display
- [ ] 2.2.2 Update sole survivor display section
- [ ] 2.2.3 Update draft picks display section
- [ ] 2.2.4 Update team member rows (use entity-row)
- [ ] 2.2.5 Test change sole survivor modal integration

**Files to modify:**
- `frontend/src/components/MyTeamCard.jsx`

---

#### **Task 2.3: Migrate CurrentPredictionsCard.jsx**
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Sub-tasks:**
- [ ] 2.3.1 Update card header structure
- [ ] 2.3.2 Update prediction contestant cards
- [ ] 2.3.3 Update lock status badges
- [ ] 2.3.4 Test prediction submission flow

**Files to modify:**
- `frontend/src/components/CurrentPredictionsCard.jsx`

---

### **Phase 3: Layout Components (Medium Impact)**

#### **Task 3.1: Migrate Home.jsx Layout**
**Priority**: Medium | **Effort**: Small | **Impact**: Medium

**Current Classes → New Classes:**
```jsx
// OLD
<div className="dashboard-columns dashboard-columns--three">
  <div className="dashboard-column">
    <LeaderboardCard />
  </div>
  <div className="dashboard-column">
    <MyTeamCard />
  </div>
  <div className="dashboard-column">
    <CurrentPredictionsCard />
  </div>
</div>

// NEW
<div className="layout-columns--three">
  <div className="layout-column">
    <LeaderboardCard />
  </div>
  <div className="layout-column">
    <MyTeamCard />
  </div>
  <div className="layout-column">
    <CurrentPredictionsCard />
  </div>
</div>
```

**Sub-tasks:**
- [ ] 3.1.1 Update dashboard container classes
- [ ] 3.1.2 Update column layout classes
- [ ] 3.1.3 Update survivor tagline section
- [ ] 3.1.4 Test responsive behavior
- [ ] 3.1.5 Verify mobile layout works

**Files to modify:**
- `frontend/src/components/Home.jsx`

---

### **Phase 4: Form Components (Medium Impact)**

#### **Task 4.1: Migrate Login.jsx**
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Current Classes → New Classes:**
```jsx
// OLD
<form className="login-form">
  <input type="email" className="form-input" />
  <button type="submit" className="btn-primary">Login</button>
</form>

// NEW
<form className="form">
  <div className="form-group">
    <label className="form-label">Email</label>
    <input type="email" className="form-input" />
  </div>
  <div className="form-group">
    <button type="submit" className="btn btn--primary">Login</button>
  </div>
</form>
```

**Sub-tasks:**
- [ ] 4.1.1 Update form structure and classes
- [ ] 4.1.2 Update input field classes
- [ ] 4.1.3 Update button classes
- [ ] 4.1.4 Update error message display
- [ ] 4.1.5 Test form validation states

**Files to modify:**
- `frontend/src/components/Login.jsx`

---

#### **Task 4.2: Migrate SignUp.jsx**
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Sub-tasks:**
- [ ] 4.2.1 Update form structure and classes
- [ ] 4.2.2 Update input field classes
- [ ] 4.2.3 Update button classes
- [ ] 4.2.4 Update file upload component
- [ ] 4.2.5 Test form validation states

**Files to modify:**
- `frontend/src/components/SignUp.jsx`

---

#### **Task 4.3: Migrate Ranking.jsx**
**Priority**: Medium | **Effort**: Large | **Impact**: Medium

**Sub-tasks:**
- [ ] 4.3.1 Update form structure
- [ ] 4.3.2 Update contestant selection cards
- [ ] 4.3.3 Update drag-and-drop styling
- [ ] 4.3.4 Update sole survivor selection
- [ ] 4.3.5 Update submit button styling

**Files to modify:**
- `frontend/src/components/Ranking.jsx`

---

### **Phase 5: Navigation & Global Components (Low Impact)**

#### **Task 5.1: Migrate Navigation.jsx**
**Priority**: Low | **Effort**: Small | **Impact**: Low

**Sub-tasks:**
- [ ] 5.1.1 Update navigation structure (already mostly good)
- [ ] 5.1.2 Update mobile menu classes
- [ ] 5.1.3 Update navigation badges
- [ ] 5.1.4 Test responsive behavior

**Files to modify:**
- `frontend/src/components/Navigation.jsx`

---

#### **Task 5.2: Migrate Profile.jsx**
**Priority**: Low | **Effort**: Medium | **Impact**: Low

**Sub-tasks:**
- [ ] 5.2.1 Update profile card structure
- [ ] 5.2.2 Update avatar upload component
- [ ] 5.2.3 Update form elements
- [ ] 5.2.4 Update button classes

**Files to modify:**
- `frontend/src/components/Profile.jsx`

---

### **Phase 6: Admin Components (Low Priority)**

#### **Task 6.1: Migrate Admin.jsx**
**Priority**: Low | **Effort**: Large | **Impact**: Low

**Sub-tasks:**
- [ ] 6.1.1 Update admin dashboard layout
- [ ] 6.1.2 Update admin cards
- [ ] 6.1.3 Update admin forms
- [ ] 6.1.4 Update admin tables

**Files to modify:**
- `frontend/src/components/Admin.jsx`
- `frontend/src/components/AdminEventEntry.jsx`
- `frontend/src/components/AdminPredictionManager.jsx`

---

## 🧪 **Testing Strategy**

### **Visual Regression Testing**
- [ ] Take screenshots before migration
- [ ] Compare screenshots after each phase
- [ ] Test on multiple screen sizes
- [ ] Test in different browsers

### **Functional Testing**
- [ ] All interactive elements work (buttons, forms, modals)
- [ ] Hover states and animations work
- [ ] Mobile responsive behavior maintained
- [ ] Accessibility features preserved
- [ ] Performance not degraded

### **Cross-Browser Testing**
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile browsers

## 📈 **Success Metrics**

### **Code Quality**
- [ ] Reduced CSS bundle size (already achieved)
- [ ] Consistent component usage across app
- [ ] Improved maintainability
- [ ] Better responsive design

### **User Experience**
- [ ] No visual regressions
- [ ] All functionality preserved
- [ ] Improved performance
- [ ] Better accessibility

### **Developer Experience**
- [ ] Easier to add new features
- [ ] Consistent patterns to follow
- [ ] Better component reusability
- [ ] Cleaner codebase

## 🚀 **Execution Plan**

### **Week 1: Core Components**
- Execute Tasks 1.1 and 1.2 (PlayerRow, ContestantRow)
- Test and validate changes
- Fix any issues found

### **Week 2: Card Components**
- Execute Tasks 2.1, 2.2, 2.3 (LeaderboardCard, MyTeamCard, CurrentPredictionsCard)
- Test layout and functionality
- Update any dependent components

### **Week 3: Layout & Forms**
- Execute Tasks 3.1, 4.1, 4.2 (Home layout, Login, SignUp)
- Test responsive behavior
- Validate form functionality

### **Week 4: Remaining Components**
- Execute Tasks 4.3, 5.1, 5.2 (Ranking, Navigation, Profile)
- Complete testing and validation
- Clean up legacy compatibility layer

### **Week 5: Admin & Polish**
- Execute Task 6.1 (Admin components)
- Final testing and bug fixes
- Documentation updates
- Performance optimization

## 🔧 **Tools & Resources**

### **Development Tools**
- Browser dev tools for testing
- React dev tools for component inspection
- CSS specificity calculator
- Accessibility testing tools

### **Documentation**
- Component usage examples in test page
- CSS architecture documentation
- Migration guide for future reference

## 📋 **Rollback Plan**

If issues are encountered:

1. **Component Level**: Revert individual component changes
2. **CSS Level**: Use legacy compatibility layer
3. **Full Rollback**: Restore original dashboard.css if needed

## ✅ **Definition of Done**

A task is complete when:
- [ ] All old CSS classes replaced with new component classes
- [ ] Visual appearance matches original design
- [ ] All functionality works as expected
- [ ] Responsive behavior maintained
- [ ] Accessibility features preserved
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] Testing completed and passed

---

**Total Estimated Effort**: 4-5 weeks
**Total Tasks**: 25 main tasks, 60+ sub-tasks
**Risk Level**: Low (legacy compatibility layer provides safety net)
**Impact Level**: High (improved maintainability and consistency)