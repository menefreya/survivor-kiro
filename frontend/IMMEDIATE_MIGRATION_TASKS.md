# Immediate Migration Tasks - Ready to Execute

## 🎯 **Start Here: High-Impact Quick Wins**

### **Task A: PlayerRow.jsx Migration** ⭐ **START WITH THIS**
**Why**: Used in leaderboard, affects every dashboard view
**Effort**: 30 minutes | **Impact**: Immediate visual improvement

**Steps:**
1. Open `frontend/src/components/PlayerRow.jsx`
2. Replace class names following the mapping below
3. Test in browser at `http://localhost:5176/`
4. Verify hover effects and expandable functionality

**Class Mapping:**
```jsx
// Find and replace these patterns:
className="player-row" → className="entity-row entity-row--interactive"
className="rank-badge" → className="badge badge--md"
className="rank-badge-gold" → className="badge--rank-gold"
className="rank-badge-silver" → className="badge--rank-silver"
className="rank-badge-bronze" → className="badge--rank-bronze"
className="rank-badge-blue" → className="badge--rank-default"
className="player-avatar" → className="entity-row__avatar"
className="avatar-initial" → className="avatar__initials"
className="player-info" → className="entity-row__info"
className="player-name" → className="entity-row__name"
className="player-username" → className="entity-row__subtitle"
className="player-score" → className="entity-row__stats"
className="score-value" → className="entity-row__score"
className="score-label" → className="entity-row__score-label"
```

---

### **Task B: Update Button Classes** ⭐ **QUICK WIN**
**Why**: Buttons are used everywhere, easy to update
**Effort**: 15 minutes | **Impact**: Consistent orange primary buttons

**Steps:**
1. Search for `btn-primary` across all `.jsx` files
2. Replace with `btn btn--primary`
3. Search for `btn-secondary` and replace with `btn btn--secondary`
4. Test buttons in forms and cards

**Search & Replace:**
```bash
# In all .jsx files:
className="btn-primary" → className="btn btn--primary"
className="btn-secondary" → className="btn btn--secondary"
className="btn-danger" → className="btn btn--danger"
```

---

### **Task C: Home.jsx Layout Migration** ⭐ **VISIBLE IMPACT**
**Why**: Main dashboard layout, affects overall structure
**Effort**: 15 minutes | **Impact**: Cleaner layout code

**Steps:**
1. Open `frontend/src/components/Home.jsx`
2. Update layout classes
3. Test three-column responsive behavior

**Class Mapping:**
```jsx
className="dashboard-columns dashboard-columns--three" → className="layout-columns--three"
className="dashboard-column" → className="layout-column"
className="dashboard-container" → className="dashboard-container" (keep as-is)
```

---

## 🚀 **Execution Order**

### **Today (30 minutes total):**
1. **Task A**: PlayerRow.jsx (20 min)
2. **Task B**: Button classes (5 min)  
3. **Task C**: Home.jsx layout (5 min)

### **Result**: 
- ✅ Leaderboard uses new entity-row system
- ✅ All buttons have orange primary styling
- ✅ Dashboard layout uses new layout system
- ✅ Immediate visual improvements visible

### **Tomorrow (if desired):**
4. **Task D**: LeaderboardCard.jsx header
5. **Task E**: MyTeamCard.jsx structure
6. **Task F**: Form components (Login/SignUp)

## 🧪 **Testing After Each Task**

1. **Open browser**: `http://localhost:5176/`
2. **Check dashboard**: Verify layout and components look correct
3. **Test interactions**: Click, hover, expand functionality
4. **Check mobile**: Resize browser to test responsive design
5. **Console check**: No errors in browser console

## 🎯 **Expected Results**

After completing Tasks A, B, C:
- **PlayerRow**: Cleaner code, consistent styling, better maintainability
- **Buttons**: Orange primary buttons throughout the app
- **Layout**: More semantic layout classes, better responsive behavior
- **Overall**: 90% of visual improvements with minimal effort

## 📞 **Need Help?**

- **CSS Issues**: Check `frontend/src/styles/DASHBOARD_REFACTORING_GUIDE.md`
- **Component Examples**: Open `http://localhost:5176/test-components.html`
- **Rollback**: Legacy classes still work if needed

---

**Ready to start with Task A (PlayerRow.jsx)?** This will give you the biggest immediate impact! 🚀