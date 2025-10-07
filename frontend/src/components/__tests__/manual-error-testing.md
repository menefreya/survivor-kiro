# Manual Error Handling Testing Guide

This guide provides steps to manually test the comprehensive error handling implementation for the ContestantPerformance component.

## Test Scenarios

### 1. Network Connection Errors

**Test Steps:**
1. Open the contestants page
2. Disconnect your internet connection
3. Refresh the page or wait for auto-refresh

**Expected Results:**
- Shows network error icon (🌐)
- Displays "Connection Problem" title
- Shows "Network connection lost" message
- Provides "Retry Connection" button
- Shows help text about checking internet connection

**Additional Tests:**
- Reconnect internet - should automatically retry
- Click retry button - should attempt to reload data
- Click "Refresh Page" button - should reload entire page

### 2. Authentication Errors

**Test Steps:**
1. Manually expire your JWT token (edit localStorage)
2. Try to access the contestants page

**Expected Results:**
- Shows lock icon (🔒)
- Displays "Session Expired" title
- Shows appropriate error message
- Provides "Log In Again" button that redirects to login

### 3. Server Errors

**Test Steps:**
1. Temporarily modify the API endpoint to return 500 error
2. Access the contestants page

**Expected Results:**
- Shows warning icon (⚠️)
- Displays "Server Error" title
- Shows user-friendly server error message
- Provides retry functionality
- Shows help text about contacting support

### 4. Empty State

**Test Steps:**
1. Ensure database has no contestants
2. Access the contestants page

**Expected Results:**
- Shows people icon (👥)
- Displays "No Contestants Found" title
- Shows helpful description about what to expect
- Provides "Refresh" button
- Shows "What's Next?" help section with navigation buttons

### 5. Image Loading Errors

**Test Steps:**
1. Find a contestant with an image URL
2. Modify the image URL to be invalid
3. Observe the contestant row

**Expected Results:**
- Shows skeleton loader initially
- Falls back to initials when image fails
- Shows retry button (↻) on the initials
- Clicking retry attempts to reload image
- Proper accessibility labels throughout

### 6. Data Validation Errors

**Test Steps:**
1. Modify API to return invalid data format
2. Access the contestants page

**Expected Results:**
- Shows data icon (📊)
- Displays "Data Error" title
- Shows message about invalid data format
- Provides retry and refresh options

### 7. Auto-Refresh Behavior

**Test Steps:**
1. Load contestants page successfully
2. Cause a network error
3. Wait 30+ seconds

**Expected Results:**
- Auto-refresh should stop when errors occur
- After resolving error, auto-refresh should resume
- No loading states shown during silent auto-refresh

### 8. Retry Logic

**Test Steps:**
1. Cause network error
2. Click retry multiple times
3. Observe retry count

**Expected Results:**
- Shows "Retry attempt X of 3"
- Button shows "Retrying..." when in progress
- Button is disabled during retry
- Exponential backoff for automatic retries

## Accessibility Testing

### Keyboard Navigation
- Tab through error states
- Ensure all buttons are focusable
- Test Enter/Space key activation

### Screen Reader Testing
- Verify proper ARIA labels
- Check error announcements
- Test image alt text and fallbacks

### Visual Testing
- Test high contrast mode
- Verify focus indicators
- Check color-only information (should have icons/text too)

## Performance Testing

### Large Datasets
- Test with 50+ contestants
- Verify loading performance
- Check memory usage during auto-refresh

### Network Conditions
- Test on slow connections
- Verify timeout handling
- Check retry behavior under poor conditions

## Browser Compatibility

Test error handling across:
- Chrome/Chromium
- Firefox
- Safari
- Edge

## Mobile Testing

- Test error states on mobile devices
- Verify touch interactions for retry buttons
- Check responsive error layouts

## Error Recovery Testing

1. **Network Recovery:**
   - Start with network error
   - Restore connection
   - Verify automatic recovery

2. **Server Recovery:**
   - Start with server error
   - Fix server issue
   - Test manual retry

3. **Data Recovery:**
   - Start with empty state
   - Add contestants to database
   - Test refresh functionality

## Logging and Monitoring

Check browser console for:
- Appropriate error logging
- No sensitive data exposure
- Proper error context information
- Performance metrics

## Edge Cases

1. **Rapid Network Changes:**
   - Quickly toggle network on/off
   - Verify state consistency

2. **Multiple Simultaneous Errors:**
   - Cause multiple error types
   - Verify proper error prioritization

3. **Component Unmounting:**
   - Navigate away during error state
   - Verify cleanup of timers/listeners

4. **Concurrent Retries:**
   - Attempt multiple retries simultaneously
   - Verify only one retry executes

## Success Criteria

✅ All error states display appropriate icons and messages
✅ Retry functionality works correctly
✅ Auto-refresh behavior is appropriate
✅ Image loading errors are handled gracefully
✅ Accessibility requirements are met
✅ Performance remains acceptable under error conditions
✅ Error recovery works smoothly
✅ No console errors or warnings
✅ Responsive design works on all devices
✅ Browser compatibility is maintained

## Common Issues to Watch For

- Memory leaks from uncleared timers
- Infinite retry loops
- Inconsistent error states
- Poor accessibility in error conditions
- Performance degradation during errors
- Sensitive data exposure in error messages
- Broken auto-refresh after errors
- Image loading race conditions