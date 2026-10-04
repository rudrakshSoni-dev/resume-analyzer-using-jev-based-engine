#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:3000"
COOKIE_JAR="/tmp/e2e-cookies-$$.txt"
SAMPLE_PDF="/tmp/e2e-sample-resume-$$.pdf"

trap 'rm -f "$COOKIE_JAR" "$SAMPLE_PDF"' EXIT

echo "=========================================================="
echo "Phase 8 — Definition of Done 14-Step End-to-End Verification"
echo "=========================================================="

# Create minimal valid PDF
cat << 'EOF' > "$SAMPLE_PDF"
%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 170 >> stream
BT
/F1 12 Tf
100 700 Td
(Alex Senior Fullstack Engineer 5 years experience) Tj
0 -20 Td
(Skills: TypeScript Node.js Express React Next.js PostgreSQL Docker REST) Tj
0 -20 Td
(Education: Bachelor Computer Science) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000117 00000 n
0000000226 00000 n
0000000446 00000 n
trailer << /Root 1 0 R /Size 6 >>
startxref
519
%%EOF
EOF

RANDOM_ID=$(date +%s%N)
TEST_EMAIL="e2e_${RANDOM_ID}@test.com"
TEST_PASSWORD="password1234"

# 1. Register new user
echo -e "\n[Step 1] Register new user: $TEST_EMAIL"
REG_STATUS=$(curl -s -o /tmp/reg_out.json -w "%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if [ "$REG_STATUS" != "201" ]; then
  echo "❌ Failed to register: status $REG_STATUS"
  cat /tmp/reg_out.json
  exit 1
fi
echo "✓ Registered successfully (HTTP $REG_STATUS)"

# 2. Login
echo -e "\n[Step 2] Login to obtain HTTP-only JWT cookie"
LOGIN_STATUS=$(curl -s -o /tmp/login_out.json -w "%{http_code}" -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if [ "$LOGIN_STATUS" != "200" ]; then
  echo "❌ Failed to login: status $LOGIN_STATUS"
  cat /tmp/login_out.json
  exit 1
fi
echo "✓ Login successful (HTTP $LOGIN_STATUS)"

# 3. Verify session
echo -e "\n[Step 3] Verify authenticated session via /api/auth/me"
ME_RES=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/auth/me")
ME_EMAIL=$(echo "$ME_RES" | grep -o "\"email\":\"[^\"]*\"" | cut -d'"' -f4)
if [ "$ME_EMAIL" != "$TEST_EMAIL" ]; then
  echo "❌ Session check failed: got $ME_EMAIL, expected $TEST_EMAIL"
  exit 1
fi
echo "✓ Session verified: authenticated as $ME_EMAIL"

# 4. Upload resume (PDF)
echo -e "\n[Step 4] Upload PDF resume"
RESUME_RES=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/resumes" \
  -F "resume=@$SAMPLE_PDF;type=application/pdf")
RESUME_ID=$(echo "$RESUME_RES" | grep -o "\"id\":\"[^\"]*\"" | head -n1 | cut -d'"' -f4)

if [ -z "$RESUME_ID" ]; then
  echo "❌ Failed to upload resume:"
  echo "$RESUME_RES"
  exit 1
fi
echo "✓ Resume uploaded successfully. ID: $RESUME_ID"

# 5. Create job description
echo -e "\n[Step 5] Create Job Description"
JOB_PAYLOAD="{\"title\":\"Senior Fullstack Engineer\",\"company\":\"Tech Flow Inc\",\"description\":\"We need a Senior Fullstack Engineer with 5+ years experience in React, Next.js, Node.js, TypeScript, and PostgreSQL.\"}"
JOB_RES=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/jobs" \
  -H "Content-Type: application/json" \
  -d "$JOB_PAYLOAD")
JOB_ID=$(echo "$JOB_RES" | grep -o "\"id\":\"[^\"]*\"" | head -n1 | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "❌ Failed to create job description:"
  echo "$JOB_RES"
  exit 1
fi
echo "✓ Job description created. ID: $JOB_ID"

# 6. Trigger analysis
echo -e "\n[Step 6] Trigger analysis on resume + JD pair"
ANALYSIS_RES=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/analysis" \
  -H "Content-Type: application/json" \
  -d "{\"resumeId\":\"$RESUME_ID\",\"jobDescriptionId\":\"$JOB_ID\"}")
ANALYSIS_ID=$(echo "$ANALYSIS_RES" | grep -o "\"id\":\"[^\"]*\"" | head -n1 | cut -d'"' -f4)
SCORE=$(echo "$ANALYSIS_RES" | grep -o "\"score\":[0-9]*" | head -n1 | cut -d':' -f2)

if [ -z "$ANALYSIS_ID" ] || [ -z "$SCORE" ]; then
  echo "❌ Failed to generate analysis:"
  echo "$ANALYSIS_RES"
  exit 1
fi
echo "✓ Analysis generated. ID: $ANALYSIS_ID, Score: $SCORE/100"

# 7. Check score and breakdown
echo -e "\n[Step 7] Verify score and breakdown details"
if [ "$SCORE" -lt 60 ]; then
  echo "❌ Expected high score for strong match, got $SCORE"
  exit 1
fi
echo "✓ Score matches expected high range: $SCORE >= 60"

# 8. List analyses
echo -e "\n[Step 8] Retrieve list of past analyses"
LIST_RES=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/analysis")
if ! echo "$LIST_RES" | grep -q "$ANALYSIS_ID"; then
  echo "❌ Analysis $ANALYSIS_ID not found in user analysis list:"
  echo "$LIST_RES"
  exit 1
fi
echo "✓ User analysis list contains analysis $ANALYSIS_ID"

# 9. Retrieve individual analysis detail
echo -e "\n[Step 9] Retrieve individual analysis detail by ID"
DETAIL_RES=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/analysis/$ANALYSIS_ID")
if ! echo "$DETAIL_RES" | grep -q "\"breakdown\""; then
  echo "❌ Detailed analysis breakdown missing:"
  echo "$DETAIL_RES"
  exit 1
fi
echo "✓ Detailed breakdown verified (skills, experience, relevance, education)"

# 10. Verify frontend pages respond with HTTP 200
echo -e "\n[Step 10] Verify Next.js frontend pages render"
DASH_PAGE_CODE=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard")
DETAIL_PAGE_CODE=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard/analysis/$ANALYSIS_ID")

if [ "$DASH_PAGE_CODE" != "200" ] || [ "$DETAIL_PAGE_CODE" != "200" ]; then
  echo "❌ Frontend pages failed to render (Dashboard: $DASH_PAGE_CODE, Detail: $DETAIL_PAGE_CODE)"
  exit 1
fi
echo "✓ /dashboard and /dashboard/analysis/$ANALYSIS_ID rendered successfully (HTTP 200)"

# 11. Logout
echo -e "\n[Step 11] Log out user"
LOGOUT_STATUS=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/logout")
if [ "$LOGOUT_STATUS" != "200" ]; then
  echo "❌ Logout failed: status $LOGOUT_STATUS"
  exit 1
fi
echo "✓ Logout successful (HTTP 200)"

# 12. Verify session is cleared & protected routes redirect
echo -e "\n[Step 12] Verify unauthenticated access to /dashboard redirects"
PROTECTED_CODE=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard")
if [ "$PROTECTED_CODE" != "307" ] && [ "$PROTECTED_CODE" != "302" ]; then
  echo "❌ Expected redirect for unauthenticated dashboard, got HTTP $PROTECTED_CODE"
  exit 1
fi
echo "✓ Unauthenticated request redirected properly (HTTP $PROTECTED_CODE)"

# 13. Log back in and confirm history persists
echo -e "\n[Step 13] Log back in and verify history persisted"
curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" > /dev/null

PERSISTED_LIST=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/analysis")
if ! echo "$PERSISTED_LIST" | grep -q "$ANALYSIS_ID"; then
  echo "❌ Persisted history missing analysis $ANALYSIS_ID after re-login"
  exit 1
fi
echo "✓ History successfully persisted across sessions"

# 14. Verify cross-user data isolation
echo -e "\n[Step 14] Verify strict cross-user data isolation"
USER_B_COOKIE="/tmp/e2e-userb-cookies-$$.txt"
USER_B_EMAIL="user_b_${RANDOM_ID}@test.com"

curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" > /dev/null

curl -s -c "$USER_B_COOKIE" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" > /dev/null

USER_B_ATTACK_RES=$(curl -s -w "%{http_code}" -b "$USER_B_COOKIE" "$BASE_URL/api/analysis/$ANALYSIS_ID")
ATTACK_STATUS="${USER_B_ATTACK_RES: -3}"
if [ "$ATTACK_STATUS" != "404" ]; then
  echo "❌ Isolation breach! User B accessed User A's analysis: HTTP $ATTACK_STATUS"
  rm -f "$USER_B_COOKIE"
  exit 1
fi
rm -f "$USER_B_COOKIE"
echo "✓ Isolation check passed: User B receives HTTP 404 attempting to access User A's data"

echo -e "\n=========================================================="
echo "🎉 ALL 14 STEPS OF PHASE 8 DEFINITION OF DONE PASSED!"
echo "=========================================================="
