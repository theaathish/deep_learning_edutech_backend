#!/bin/bash

# EduTech Backend API Test Script
# This script tests all major endpoints

BASE_URL="http://localhost:8000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "   EduTech Backend API Test Suite"
echo "=========================================="
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[TEST 1]${NC} Health Check..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Health endpoint responding"
else
    echo -e "${RED}✗ FAILED${NC} - Health endpoint returned $response"
fi
echo ""

# Test 2: Admin Login
echo -e "${YELLOW}[TEST 2]${NC} Admin Login..."
login_response=$(curl -s -X POST "$BASE_URL/api/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@edutech.com","password":"Admin@123"}')

token=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$token" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Admin login successful"
    echo "   Token: ${token:0:20}..."
else
    echo -e "${RED}✗ FAILED${NC} - Admin login failed"
    echo "   Response: $login_response"
fi
echo ""

# Test 3: Dashboard Stats (requires admin auth)
echo -e "${YELLOW}[TEST 3]${NC} Admin Dashboard Stats..."
if [ ! -z "$token" ]; then
    dashboard_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/dashboard/stats" \
        -H "Authorization: Bearer $token")
    
    if [ "$dashboard_response" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Dashboard stats accessible"
    else
        echo -e "${RED}✗ FAILED${NC} - Dashboard returned $dashboard_response"
    fi
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} - No admin token available"
fi
echo ""

# Test 4: System Stats
echo -e "${YELLOW}[TEST 4]${NC} System Monitoring..."
if [ ! -z "$token" ]; then
    system_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/system/stats" \
        -H "Authorization: Bearer $token")
    
    if [ "$system_response" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - System stats accessible"
    else
        echo -e "${RED}✗ FAILED${NC} - System stats returned $system_response"
    fi
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} - No admin token available"
fi
echo ""

# Test 5: Get All Courses (public)
echo -e "${YELLOW}[TEST 5]${NC} Get Courses (Public)..."
courses_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/courses")
if [ "$courses_response" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Courses endpoint accessible"
else
    echo -e "${RED}✗ FAILED${NC} - Courses returned $courses_response"
fi
echo ""

# Test 6: Admin Get Teachers
echo -e "${YELLOW}[TEST 6]${NC} Admin - Get All Teachers..."
if [ ! -z "$token" ]; then
    teachers_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/teachers" \
        -H "Authorization: Bearer $token")
    
    if [ "$teachers_response" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Teachers endpoint accessible"
    else
        echo -e "${RED}✗ FAILED${NC} - Teachers returned $teachers_response"
    fi
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} - No admin token available"
fi
echo ""

# Test 7: Admin Get Students
echo -e "${YELLOW}[TEST 7]${NC} Admin - Get All Students..."
if [ ! -z "$token" ]; then
    students_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/students" \
        -H "Authorization: Bearer $token")
    
    if [ "$students_response" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Students endpoint accessible"
    else
        echo -e "${RED}✗ FAILED${NC} - Students returned $students_response"
    fi
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} - No admin token available"
fi
echo ""

# Test 8: Admin Get Payments
echo -e "${YELLOW}[TEST 8]${NC} Admin - Get All Payments..."
if [ ! -z "$token" ]; then
    payments_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/payments" \
        -H "Authorization: Bearer $token")
    
    if [ "$payments_response" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Payments endpoint accessible"
    else
        echo -e "${RED}✗ FAILED${NC} - Payments returned $payments_response"
    fi
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} - No admin token available"
fi
echo ""

# Test 9: Admin Get Courses
echo -e "${YELLOW}[TEST 9]${NC} Admin - Course Management..."
if [ ! -z "$token" ]; then
    admin_courses_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/courses" \
        -H "Authorization: Bearer $token")
    
    if [ "$admin_courses_response" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Admin courses endpoint accessible"
    else
        echo -e "${RED}✗ FAILED${NC} - Admin courses returned $admin_courses_response"
    fi
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} - No admin token available"
fi
echo ""

# Test 10: Unauthorized Access Check
echo -e "${YELLOW}[TEST 10]${NC} Security - Unauthorized Access..."
unauth_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/dashboard/stats")
if [ "$unauth_response" = "401" ] || [ "$unauth_response" = "403" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Protected endpoints properly secured"
else
    echo -e "${RED}✗ FAILED${NC} - Unauthorized access returned $unauth_response (expected 401/403)"
fi
echo ""

# Test 11: CORS Headers
echo -e "${YELLOW}[TEST 11]${NC} CORS Configuration..."
cors_check=$(curl -s -I "$BASE_URL/health" | grep -i "access-control-allow")
if [ ! -z "$cors_check" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - CORS headers present"
else
    echo -e "${YELLOW}⊘ WARNING${NC} - CORS headers not detected"
fi
echo ""

# Test 12: Static Files (Uploads)
echo -e "${YELLOW}[TEST 12]${NC} Static File Serving..."
static_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/uploads/")
if [ "$static_response" = "200" ] || [ "$static_response" = "403" ] || [ "$static_response" = "404" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Uploads directory configured"
else
    echo -e "${YELLOW}⊘ WARNING${NC} - Uploads returned $static_response"
fi
echo ""

echo "=========================================="
echo "         Test Suite Complete"
echo "=========================================="
