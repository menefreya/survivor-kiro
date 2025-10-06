# Admin Prediction Manager Fix

## Issue

The admin page was showing a 500 Internal Server Error when trying to fetch episode predictions:

```
GET http://localhost:3001/api/episodes/6/predictions 500 (Internal Server Error)
```

## Root Cause

The `getEpisodePredictions` controller was querying for a `username` column in the `players` table, but the actual column name is `name`.

### Backend Error
```javascript
// Incorrect
players (
  id,
  username,  // ❌ This column doesn't exist
  email
)
```

### Database Schema
The `players` table has these columns:
- `id`
- `name` ✅ (not `username`)
- `email`
- `password_hash`
- `is_admin`
- `profile_image_url`
- `has_submitted_rankings`
- `sole_survivor_id`

## Fix Applied

### 1. Backend Controller
**File:** `backend/controllers/predictionController.js`

**Changed:**
```javascript
// Before
players (
  id,
  username,  // ❌ Wrong column name
  email
)

// After
players (
  id,
  name,      // ✅ Correct column name
  email
)
```

**Also updated the response mapping:**
```javascript
// Before
player: {
  id: prediction.players.id,
  username: prediction.players.username,  // ❌
  email: prediction.players.email
}

// After
player: {
  id: prediction.players.id,
  name: prediction.players.name,          // ✅
  email: prediction.players.email
}
```

### 2. Frontend Component
**File:** `frontend/src/components/AdminPredictionManager.jsx`

**Changed:**
```jsx
// Before
<strong>{prediction.player.username}</strong>  // ❌

// After
<strong>{prediction.player.name}</strong>      // ✅
```

## Testing

### Verified Working
- ✅ Admin can view episode predictions
- ✅ Player names display correctly
- ✅ No 500 errors
- ✅ Predictions grouped by tribe
- ✅ Scoring status visible

### API Response Format
```json
{
  "episode": {
    "id": 6,
    "episode_number": 6,
    "predictions_locked": true
  },
  "predictions_by_tribe": {
    "Taku": [
      {
        "id": 1,
        "player": {
          "id": 1,
          "name": "John Doe",
          "email": "john@example.com"
        },
        "contestant": {
          "id": 10,
          "name": "Jonathan",
          "image_url": "...",
          "current_tribe": "Taku"
        },
        "is_correct": true,
        "scored": true,
        "scored_at": "2024-03-16T20:00:00Z",
        "created_at": "2024-03-15T10:30:00Z"
      }
    ]
  },
  "total_predictions": 15
}
```

## Related Issues

This was likely introduced when the prediction feature was initially developed, possibly copying from another codebase that used `username` instead of `name`.

## Files Modified

1. `backend/controllers/predictionController.js` - Fixed column name in query
2. `frontend/src/components/AdminPredictionManager.jsx` - Fixed property reference

## Prevention

To prevent similar issues:
- Always verify column names against actual database schema
- Use consistent naming conventions across the application
- Test admin features thoroughly
- Add integration tests for admin endpoints

---

**Status:** ✅ Fixed  
**Date:** 2025-10-05  
**Error:** 500 Internal Server Error → Resolved  
**Admin Features:** All working
