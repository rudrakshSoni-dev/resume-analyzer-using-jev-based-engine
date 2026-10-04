#!/bin/bash
BASE_URL="http://localhost:3002/api"
COOKIE_A="/tmp/cookie-job-a.txt"
COOKIE_B="/tmp/cookie-job-b.txt"

# Cleanup previous files
rm -f "$COOKIE_A" "$COOKIE_B"

echo "=== Phase 4 Job Descriptions API & Ownership Tests ==="

RAND_A=$RANDOM
RAND_B=$RANDOM
EMAIL_A="user_job_a_${RAND_A}@example.com"
EMAIL_B="user_job_b_${RAND_B}@example.com"

# 1. Register & Login User A
echo -e "\n1. Register & Login User A..."
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_A\",\"password\":\"password123\"}" > /dev/null
curl -s -c "$COOKIE_A" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_A\",\"password\":\"password123\"}" > /dev/null

# 2. Register & Login User B
echo -e "\n2. Register & Login User B..."
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_B\",\"password\":\"password123\"}" > /dev/null
curl -s -c "$COOKIE_B" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_B\",\"password\":\"password123\"}" > /dev/null

# 3. User A creates Job Description 1 (with company) and Job Description 2 (without company)
echo -e "\n3. User A creates Job Description 1 (with company)..."
CREATE_RES1=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -d '{"title":"Senior Backend Engineer","company":"Tech Corp","description":"Looking for Node.js, Express, TypeScript, PostgreSQL expert."}')

HTTP_CODE1=$(echo "$CREATE_RES1" | tail -n1)
BODY1=$(echo "$CREATE_RES1" | head -n-1)
echo "HTTP $HTTP_CODE1: $BODY1"

if [ "$HTTP_CODE1" -ne 201 ]; then
  echo "❌ FAILED: Expected 201 Created for Job 1, got $HTTP_CODE1"
  exit 1
fi

JOB_ID1=$(echo "$BODY1" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$JOB_ID1" ]; then
  echo "❌ FAILED to extract Job ID 1 from response!"
  exit 1
fi
echo "✓ Created Job ID 1: $JOB_ID1"

echo -e "\nUser A creates Job Description 2 (without company)..."
CREATE_RES2=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -d '{"title":"Frontend Developer","description":"Proficient in React, Next.js, and CSS."}')

HTTP_CODE2=$(echo "$CREATE_RES2" | tail -n1)
BODY2=$(echo "$CREATE_RES2" | head -n-1)
echo "HTTP $HTTP_CODE2: $BODY2"

if [ "$HTTP_CODE2" -ne 201 ]; then
  echo "❌ FAILED: Expected 201 Created for Job 2, got $HTTP_CODE2"
  exit 1
fi

JOB_ID2=$(echo "$BODY2" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✓ Created Job ID 2: $JOB_ID2"

# 4. User A lists jobs
echo -e "\n4. User A lists jobs..."
LIST_A=$(curl -s -b "$COOKIE_A" -X GET "$BASE_URL/jobs")
echo "User A jobs: $LIST_A"

if echo "$LIST_A" | grep -q "$JOB_ID1" && echo "$LIST_A" | grep -q "$JOB_ID2"; then
  echo "✓ User A sees both created jobs"
else
  echo "❌ User A does not see all created jobs!"
  exit 1
fi

# 5. User B lists jobs (should not see User A's jobs)
echo -e "\n5. User B lists jobs (isolation check)..."
LIST_B=$(curl -s -b "$COOKIE_B" -X GET "$BASE_URL/jobs")
echo "User B jobs: $LIST_B"

if echo "$LIST_B" | grep -q "$JOB_ID1" || echo "$LIST_B" | grep -q "$JOB_ID2"; then
  echo "❌ OWNERSHIP LEAK: User B sees User A's jobs!"
  exit 1
else
  echo "✓ User B does not see User A's jobs"
fi

# 6. User A gets job by ID
echo -e "\n6. User A fetches Job 1 by ID..."
GET_A=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X GET "$BASE_URL/jobs/$JOB_ID1")
HTTP_CODE_GET_A=$(echo "$GET_A" | tail -n1)
BODY_GET_A=$(echo "$GET_A" | head -n-1)
echo "HTTP $HTTP_CODE_GET_A: $BODY_GET_A"

if [ "$HTTP_CODE_GET_A" -eq 200 ] && echo "$BODY_GET_A" | grep -q "Senior Backend Engineer"; then
  echo "✓ User A successfully retrieved Job 1 with full description"
else
  echo "❌ User A failed to retrieve own job!"
  exit 1
fi

# 7. User B attempts to get User A's job by ID (cross-user check)
echo -e "\n7. User B fetches User A's Job 1 by ID (cross-user check)..."
GET_B=$(curl -s -w "\n%{http_code}" -b "$COOKIE_B" -X GET "$BASE_URL/jobs/$JOB_ID1")
HTTP_CODE_GET_B=$(echo "$GET_B" | tail -n1)
BODY_GET_B=$(echo "$GET_B" | head -n-1)
echo "HTTP $HTTP_CODE_GET_B: $BODY_GET_B"

if [ "$HTTP_CODE_GET_B" -eq 404 ]; then
  echo "✓ Ownership check PASSED: User B cannot fetch User A's job (HTTP 404)"
else
  echo "❌ OWNERSHIP VIOLATION: Expected 404, got $HTTP_CODE_GET_B!"
  exit 1
fi

# 8. User B attempts to delete User A's job by ID (cross-user check)
echo -e "\n8. User B attempts to delete User A's Job 1 (cross-user check)..."
DEL_B=$(curl -s -w "\n%{http_code}" -b "$COOKIE_B" -X DELETE "$BASE_URL/jobs/$JOB_ID1")
HTTP_CODE_DEL_B=$(echo "$DEL_B" | tail -n1)
BODY_DEL_B=$(echo "$DEL_B" | head -n-1)
echo "HTTP $HTTP_CODE_DEL_B: $BODY_DEL_B"

if [ "$HTTP_CODE_DEL_B" -eq 404 ]; then
  echo "✓ Ownership check PASSED: User B cannot delete User A's job (HTTP 404)"
else
  echo "❌ OWNERSHIP VIOLATION: Expected 404, got $HTTP_CODE_DEL_B!"
  exit 1
fi

# 9. Validation error tests
echo -e "\n9. Input validation error tests..."

# Empty title
BAD_JOB1=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -d '{"title":"","description":"Valid description"}')
HTTP_BAD1=$(echo "$BAD_JOB1" | tail -n1)
echo "Empty title response code: $HTTP_BAD1"
if [ "$HTTP_BAD1" -eq 400 ]; then
  echo "✓ Correctly rejected empty title (HTTP 400)"
else
  echo "❌ Failed to reject empty title! Got $HTTP_BAD1"
  exit 1
fi

# Missing description
BAD_JOB2=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -d '{"title":"Valid Title"}')
HTTP_BAD2=$(echo "$BAD_JOB2" | tail -n1)
echo "Missing description response code: $HTTP_BAD2"
if [ "$HTTP_BAD2" -eq 400 ]; then
  echo "✓ Correctly rejected missing description (HTTP 400)"
else
  echo "❌ Failed to reject missing description! Got $HTTP_BAD2"
  exit 1
fi

# 10. Unauthenticated requests
echo -e "\n10. Unauthenticated request tests..."
NOAUTH=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test"}')
HTTP_NOAUTH=$(echo "$NOAUTH" | tail -n1)
if [ "$HTTP_NOAUTH" -eq 401 ]; then
  echo "✓ Correctly rejected unauthenticated POST (HTTP 401)"
else
  echo "❌ Failed to reject unauthenticated POST! Got $HTTP_NOAUTH"
  exit 1
fi

# 11. User A deletes Job 1
echo -e "\n11. User A deletes Job 1..."
DEL_A=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X DELETE "$BASE_URL/jobs/$JOB_ID1")
HTTP_DEL_A=$(echo "$DEL_A" | tail -n1)
BODY_DEL_A=$(echo "$DEL_A" | head -n-1)
echo "HTTP $HTTP_DEL_A: $BODY_DEL_A"
if [ "$HTTP_DEL_A" -eq 200 ]; then
  echo "✓ User A successfully deleted Job 1"
else
  echo "❌ Failed to delete job! Got $HTTP_DEL_A"
  exit 1
fi

# 12. Confirm deleted job cannot be retrieved
echo -e "\n12. Confirm deleted job is gone..."
GET_DEL=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X GET "$BASE_URL/jobs/$JOB_ID1")
HTTP_GET_DEL=$(echo "$GET_DEL" | tail -n1)
if [ "$HTTP_GET_DEL" -eq 404 ]; then
  echo "✓ Deleted job verified gone (HTTP 404)"
else
  echo "❌ Expected 404 for deleted job, got $HTTP_GET_DEL"
  exit 1
fi

# 13. Clean up Job 2
curl -s -b "$COOKIE_A" -X DELETE "$BASE_URL/jobs/$JOB_ID2" > /dev/null

# Clean up cookie files
rm -f "$COOKIE_A" "$COOKIE_B"
echo -e "\n=== All Phase 4 Job Description Tests Passed Successfully! ==="
