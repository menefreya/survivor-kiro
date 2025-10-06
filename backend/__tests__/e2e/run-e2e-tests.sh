#!/bin/bash

# End-to-End Test Runner for Survivor Fantasy League
# This script runs all E2E test suites

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Survivor Fantasy League - E2E Test Suite             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if server is running
echo "Checking if server is running..."
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    echo "❌ Server is not running!"
    echo ""
    echo "Please start the server first:"
    echo "  cd backend && npm run dev"
    echo ""
    exit 1
fi

echo "✓ Server is running"
echo ""

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo "════════════════════════════════════════════════════════"
    echo "Running: $test_name"
    echo "════════════════════════════════════════════════════════"
    echo ""
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if node "$test_file"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo ""
        echo "✓ $test_name PASSED"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo ""
        echo "✗ $test_name FAILED"
    fi
    
    echo ""
    echo ""
}

# Run all test suites
run_test "Authentication Workflow" "backend/test-e2e-auth.js"
run_test "Player Workflow" "backend/test-e2e-player.js"
run_test "Admin Workflow" "backend/test-e2e-admin.js"
run_test "Sole Survivor Re-pick" "backend/test-e2e-sole-survivor.js"

# Final summary
echo "╔════════════════════════════════════════════════════════╗"
echo "║  Final Test Summary                                    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Total Test Suites: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo "✓ All E2E test suites passed!"
    exit 0
else
    echo "✗ Some E2E test suites failed. Please review the output above."
    exit 1
fi
