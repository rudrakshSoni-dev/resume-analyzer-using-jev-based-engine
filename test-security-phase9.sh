#!/bin/bash
set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3002"
COOKIE_USER_A="/tmp/cookie_user_a_$$.txt"
COOKIE_USER_B="/tmp/cookie_user_b_$$.txt"
TEMP_DIR="/tmp/phase9_test_$$"

mkdir -p "$TEMP_DIR"

cleanup() {
  rm -f "$COOKIE_USER_A" "$COOKIE_USER_B"
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}      Phase 9: Security & Error-Handling Verification Suite     ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Check API health
echo -e "\n${YELLOW}[Setup] Checking API availability...${NC}"
HEALTH_RES=$(curl -s "$BASE_URL/api/health" || true)
if [[ "$HEALTH_RES" != *"ok"* ]]; then
  echo -e "${RED}[FAIL] API is not running at $BASE_URL. Please start it with 'npm run dev --workspace=@jev/api'${NC}"
  exit 1
fi
echo -e "${GREEN}[OK] API is healthy.${NC}"

TIMESTAMP=$(date +%s)
USER_A_EMAIL="sec_a_${TIMESTAMP}@example.com"
USER_B_EMAIL="sec_b_${TIMESTAMP}@example.com"
PASSWORD="SecurePassword123!"

# -----------------------------------------------------------------------------
# TEST GROUP 1: Credential & Secret Leakage Audits
# -----------------------------------------------------------------------------
echo -e "\n${BLUE}--- TEST GROUP 1: Credential & Secret Leakage Audits ---${NC}"

echo -n "1.1 Check X-Powered-By header disabled... "
HEADERS=$(curl -s -I "$BASE_URL/api/health")
if echo "$HEADERS" | grep -iq "x-powered-by"; then
  echo -e "${RED}[FAIL] X-Powered-By header detected in response${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (No X-Powered-By header)${NC}"

echo -n "1.2 Register User A and verify zero secret leak in response... "
REG_RES=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$REG_RES" | grep -q "passwordHash"; then
  echo -e "${RED}[FAIL] passwordHash leaked in register response!${NC}"
  echo "$REG_RES"
  exit 1
fi
if echo "$REG_RES" | grep -qi -E "DATABASE_URL|JWT_SECRET|postgres:"; then
  echo -e "${RED}[FAIL] Secret/connection string leaked in register response!${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (No passwordHash, DATABASE_URL, or JWT_SECRET)${NC}"

echo -n "1.3 Login User A and verify cookie flags & zero secret leak... "
LOGIN_HEADERS="$TEMP_DIR/login_headers.txt"
LOGIN_RES=$(curl -s -c "$COOKIE_USER_A" -D "$LOGIN_HEADERS" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_RES" | grep -q "passwordHash"; then
  echo -e "${RED}[FAIL] passwordHash leaked in login response!${NC}"
  exit 1
fi
if echo "$LOGIN_RES" | grep -qi -E "DATABASE_URL|JWT_SECRET|postgres:"; then
  echo -e "${RED}[FAIL] Secret/connection string leaked in login response!${NC}"
  exit 1
fi
if ! grep -qi "HttpOnly" "$LOGIN_HEADERS"; then
  echo -e "${RED}[FAIL] Token cookie missing HttpOnly flag!${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HttpOnly cookie set, no secrets leaked)${NC}"

echo -n "1.4 GET /api/auth/me secret leak audit... "
ME_RES=$(curl -s -b "$COOKIE_USER_A" "$BASE_URL/api/auth/me")
if echo "$ME_RES" | grep -q "passwordHash"; then
  echo -e "${RED}[FAIL] passwordHash leaked in /api/auth/me response!${NC}"
  exit 1
fi
if echo "$ME_RES" | grep -qi -E "DATABASE_URL|JWT_SECRET|postgres:"; then
  echo -e "${RED}[FAIL] Secret leaked in /api/auth/me response!${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS]${NC}"

# -----------------------------------------------------------------------------
# TEST GROUP 2: Centralized Error Handling & Shape Verification
# -----------------------------------------------------------------------------
echo -e "\n${BLUE}--- TEST GROUP 2: Centralized Error Handling & Shape Verification ---${NC}"

echo -n "2.1 401 Unauthorized shape on protected endpoint without cookie... "
UNAUTH_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/auth/me")
STATUS=$(echo "$UNAUTH_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$UNAUTH_RES" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 401 ] || ! echo "$BODY" | grep -q '"error":{"message"'; then
  echo -e "${RED}[FAIL] Expected 401 with standard error shape, got HTTP $STATUS: $BODY${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 401, shape: { error: { message } })${NC}"

echo -n "2.2 400 Bad Request shape on schema validation failure... "
BAD_REG=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"short"}')
STATUS=$(echo "$BAD_REG" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$BAD_REG" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 400 ] || ! echo "$BODY" | grep -q '"error":{"message"'; then
  echo -e "${RED}[FAIL] Expected 400 with standard error shape, got HTTP $STATUS: $BODY${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 400, shape: { error: { message } })${NC}"

echo -n "2.3 400 Bad Request on malformed JSON payload... "
BAD_JSON=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{ invalid json ')
STATUS=$(echo "$BAD_JSON" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$BAD_JSON" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 400 ] || ! echo "$BODY" | grep -q 'Invalid JSON payload'; then
  echo -e "${RED}[FAIL] Expected 400 Invalid JSON payload, got HTTP $STATUS: $BODY${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 400, message: Invalid JSON payload)${NC}"

echo -n "2.4 404 Not Found JSON fallback on undefined route (no HTML)... "
NOT_FOUND=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/some-undefined-route-xyz")
STATUS=$(echo "$NOT_FOUND" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$NOT_FOUND" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 404 ] || ! echo "$BODY" | grep -q '"error":{"message"'; then
  echo -e "${RED}[FAIL] Undefined route did not return standard JSON error shape. Got HTTP $STATUS: $BODY${NC}"
  exit 1
fi
if echo "$BODY" | grep -qi -E "<html|<body|<pre|Cannot GET"; then
  echo -e "${RED}[FAIL] Default Express HTML leaked in 404 response!${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 404 JSON, shape: { error: { message } })${NC}"

echo -n "2.5 Stack trace absence check on all error states... "
for err_body in "$BODY" "$BAD_JSON" "$BAD_REG" "$UNAUTH_RES"; do
  if echo "$err_body" | grep -qi -E "(\bat\b.*:\d+:\d+|\bnode_modules\b|stack)"; then
    echo -e "${RED}[FAIL] Stack trace trace detected in response: $err_body${NC}"
    exit 1
  fi
done
echo -e "${GREEN}[PASS] (No stack traces leaked)${NC}"

# -----------------------------------------------------------------------------
# TEST GROUP 3: File Upload Validation & Security
# -----------------------------------------------------------------------------
echo -e "\n${BLUE}--- TEST GROUP 3: File Upload Security & Validation ---${NC}"

# Create test files
NON_PDF_FILE="$TEMP_DIR/test.txt"
echo "This is a plain text file, not a PDF." > "$NON_PDF_FILE"

FAKE_PDF_FILE="$TEMP_DIR/fake.pdf"
echo "This is a text file renamed to .pdf without %PDF header." > "$FAKE_PDF_FILE"

OVERSIZED_PDF="$TEMP_DIR/oversized.pdf"
# Create 5.5MB file starting with %PDF
python3 -c "
with open('$OVERSIZED_PDF', 'wb') as f:
    f.write(b'%PDF-1.4\n')
    f.write(b'0' * (5600000))
"

VALID_PDF="$TEMP_DIR/valid.pdf"
python3 -c "
content = b'''%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 58 >> stream
BT
/F1 12 Tf
72 712 Td
(Software Engineer Resume with Python, TypeScript, Docker) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000353 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
426
%%EOF'''
with open('$VALID_PDF', 'wb') as f:
    f.write(content)
"

echo -n "3.1 Reject file with non-PDF extension (.txt)... "
NON_PDF_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_A" \
  -F "resume=@$NON_PDF_FILE" "$BASE_URL/api/resumes")
STATUS=$(echo "$NON_PDF_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$NON_PDF_RES" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 400 ] || ! echo "$BODY" | grep -q "Only PDF files are allowed"; then
  echo -e "${RED}[FAIL] Expected 400 Only PDF files are allowed, got HTTP $STATUS: $BODY${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 400 rejected)${NC}"

echo -n "3.2 Reject fake PDF file missing %PDF header magic bytes... "
FAKE_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_A" \
  -F "resume=@$FAKE_PDF_FILE;type=application/pdf" "$BASE_URL/api/resumes")
STATUS=$(echo "$FAKE_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$FAKE_RES" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 400 ] || ! echo "$BODY" | grep -q -E "missing %PDF header|Invalid PDF"; then
  echo -e "${RED}[FAIL] Expected 400 for fake PDF magic byte check, got HTTP $STATUS: $BODY${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 400 rejected missing %PDF header)${NC}"

echo -n "3.3 Reject oversized file (> 5MB)... "
OVERSIZED_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_A" \
  -F "resume=@$OVERSIZED_PDF;type=application/pdf" "$BASE_URL/api/resumes")
STATUS=$(echo "$OVERSIZED_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$OVERSIZED_RES" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 400 ] || ! echo "$BODY" | grep -q "File size exceeds maximum limit of 5MB"; then
  echo -e "${RED}[FAIL] Expected 400 File size exceeds maximum limit, got HTTP $STATUS: $BODY${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 400 rejected file > 5MB)${NC}"

echo -n "3.4 Accept valid PDF file... "
VALID_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_A" \
  -F "resume=@$VALID_PDF;type=application/pdf" "$BASE_URL/api/resumes")
STATUS=$(echo "$VALID_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$VALID_RES" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 201 ]; then
  echo -e "${RED}[FAIL] Valid PDF upload failed with HTTP $STATUS: $BODY${NC}"
  exit 1
fi
RESUME_A_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
if [ -z "$RESUME_A_ID" ]; then
  echo -e "${RED}[FAIL] Could not extract uploaded resume ID${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 201 created ID: $RESUME_A_ID)${NC}"

# -----------------------------------------------------------------------------
# TEST GROUP 4: Strict User Scoping & Cross-User Ownership Isolation
# -----------------------------------------------------------------------------
echo -e "\n${BLUE}--- TEST GROUP 4: Strict User Scoping & Cross-User Ownership Isolation ---${NC}"

# Create User A's Job Description and Analysis
JOB_A_RES=$(curl -s -b "$COOKIE_USER_A" -X POST "$BASE_URL/api/jobs" \
  -H "Content-Type: application/json" \
  -d '{"title":"Backend Engineer","company":"Tech Corp","description":"Looking for a Backend Engineer with Python, TypeScript, Docker"}')
JOB_A_ID=$(echo "$JOB_A_RES" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

ANALYSIS_A_RES=$(curl -s -b "$COOKIE_USER_A" -X POST "$BASE_URL/api/analysis" \
  -H "Content-Type: application/json" \
  -d "{\"resumeId\":\"$RESUME_A_ID\",\"jobDescriptionId\":\"$JOB_A_ID\"}")
ANALYSIS_A_ID=$(echo "$ANALYSIS_A_RES" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

# Register & Login User B
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"$PASSWORD\"}" > /dev/null

curl -s -c "$COOKIE_USER_B" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"$PASSWORD\"}" > /dev/null

echo -n "4.1 User B cannot read User A's resume (must return 404)... "
CROSS_RESUME=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_B" "$BASE_URL/api/resumes/$RESUME_A_ID")
STATUS=$(echo "$CROSS_RESUME" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$CROSS_RESUME" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 404 ] || ! echo "$BODY" | grep -q "Resume not found"; then
  echo -e "${RED}[FAIL] Expected 404 Resume not found, got HTTP $STATUS: $BODY${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 404 prevented unauthorized read)${NC}"

echo -n "4.2 User B cannot delete User A's resume (must return 404)... "
CROSS_DEL_RESUME=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_B" -X DELETE "$BASE_URL/api/resumes/$RESUME_A_ID")
STATUS=$(echo "$CROSS_DEL_RESUME" | grep "HTTP_STATUS" | cut -d':' -f2)
if [ "$STATUS" -ne 404 ]; then
  echo -e "${RED}[FAIL] Expected 404 for unauthorized delete, got HTTP $STATUS${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 404 prevented unauthorized delete)${NC}"

echo -n "4.3 User B cannot read User A's job description (must return 404)... "
CROSS_JOB=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_B" "$BASE_URL/api/jobs/$JOB_A_ID")
STATUS=$(echo "$CROSS_JOB" | grep "HTTP_STATUS" | cut -d':' -f2)
if [ "$STATUS" -ne 404 ]; then
  echo -e "${RED}[FAIL] Expected 404 Job not found, got HTTP $STATUS${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 404 prevented unauthorized read)${NC}"

echo -n "4.4 User B cannot delete User A's job description (must return 404)... "
CROSS_DEL_JOB=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_B" -X DELETE "$BASE_URL/api/jobs/$JOB_A_ID")
STATUS=$(echo "$CROSS_DEL_JOB" | grep "HTTP_STATUS" | cut -d':' -f2)
if [ "$STATUS" -ne 404 ]; then
  echo -e "${RED}[FAIL] Expected 404 for unauthorized delete, got HTTP $STATUS${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 404 prevented unauthorized delete)${NC}"

echo -n "4.5 User B cannot read User A's analysis (must return 404)... "
CROSS_ANALYSIS=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_B" "$BASE_URL/api/analysis/$ANALYSIS_A_ID")
STATUS=$(echo "$CROSS_ANALYSIS" | grep "HTTP_STATUS" | cut -d':' -f2)
if [ "$STATUS" -ne 404 ]; then
  echo -e "${RED}[FAIL] Expected 404 Analysis not found, got HTTP $STATUS${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 404 prevented unauthorized read)${NC}"

echo -n "4.6 User B cannot delete User A's analysis (must return 404)... "
CROSS_DEL_ANALYSIS=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_B" -X DELETE "$BASE_URL/api/analysis/$ANALYSIS_A_ID")
STATUS=$(echo "$CROSS_DEL_ANALYSIS" | grep "HTTP_STATUS" | cut -d':' -f2)
if [ "$STATUS" -ne 404 ]; then
  echo -e "${RED}[FAIL] Expected 404 for unauthorized delete, got HTTP $STATUS${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 404 prevented unauthorized delete)${NC}"

echo -n "4.7 User B cannot run analysis using User A's resume (must return 404)... "
CROSS_ATTACK_1=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_B" -X POST "$BASE_URL/api/analysis" \
  -H "Content-Type: application/json" \
  -d "{\"resumeId\":\"$RESUME_A_ID\",\"jobDescriptionId\":\"$JOB_A_ID\"}")
STATUS=$(echo "$CROSS_ATTACK_1" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$CROSS_ATTACK_1" | grep -v "HTTP_STATUS")
if [ "$STATUS" -ne 404 ] || ! echo "$BODY" | grep -q "Resume not found"; then
  echo -e "${RED}[FAIL] Expected 404 Resume not found, got HTTP $STATUS: $BODY${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 404 blocked cross-user analysis)${NC}"

echo -n "4.8 User A's analysis listing remains isolated from User B... "
USER_B_ANALYSES=$(curl -s -b "$COOKIE_USER_B" "$BASE_URL/api/analysis")
if echo "$USER_B_ANALYSES" | grep -q "$ANALYSIS_A_ID"; then
  echo -e "${RED}[FAIL] User A analysis leaked into User B list!${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (Isolated lists)${NC}"

# -----------------------------------------------------------------------------
# TEST GROUP 5: Authentication Session Cleared on Logout
# -----------------------------------------------------------------------------
echo -e "\n${BLUE}--- TEST GROUP 5: Session Termination on Logout ---${NC}"

echo -n "5.1 User A logs out and token cookie is cleared... "
LOGOUT_HEADERS="$TEMP_DIR/logout_headers.txt"
LOGOUT_RES=$(curl -s -b "$COOKIE_USER_A" -c "$COOKIE_USER_A" -D "$LOGOUT_HEADERS" -X POST "$BASE_URL/api/auth/logout")

if ! grep -qi "token=;" "$LOGOUT_HEADERS" && ! grep -qi "token=deleted" "$LOGOUT_HEADERS" && ! grep -qi "Max-Age=0" "$LOGOUT_HEADERS"; then
  echo -e "${RED}[FAIL] Clear-Cookie header not found or incomplete!${NC}"
  cat "$LOGOUT_HEADERS"
  exit 1
fi
echo -e "${GREEN}[PASS] (Clear-Cookie issued)${NC}"

echo -n "5.2 Request with cleared session is rejected (HTTP 401)... "
AFTER_LOGOUT=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_USER_A" "$BASE_URL/api/auth/me")
STATUS=$(echo "$AFTER_LOGOUT" | grep "HTTP_STATUS" | cut -d':' -f2)
if [ "$STATUS" -ne 401 ]; then
  echo -e "${RED}[FAIL] Expected 401 after logout, got HTTP $STATUS${NC}"
  exit 1
fi
echo -e "${GREEN}[PASS] (HTTP 401 received)${NC}"

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}🎉 ALL PHASE 9 SECURITY & ERROR-HANDLING TESTS PASSED (100%)!${NC}"
echo -e "${BLUE}================================================================${NC}"
