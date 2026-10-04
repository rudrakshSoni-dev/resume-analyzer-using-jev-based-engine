#!/bin/bash
set -e

PORT="${PORT:-3002}"
BASE_URL="http://localhost:${PORT}/api"
COOKIE_A="/tmp/cookie-analysis-a.txt"
COOKIE_B="/tmp/cookie-analysis-b.txt"
PDF_A="/tmp/resume-analysis-a.pdf"
PDF_B="/tmp/resume-analysis-b.pdf"

# Cleanup
rm -f "$COOKIE_A" "$COOKIE_B" "$PDF_A" "$PDF_B"

echo "=== Creating Sample PDF Files ==="
cat << 'EOF' > "$PDF_A"
%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 170 >> stream
BT
/F1 12 Tf
100 700 Td
(Alex Senior Backend Engineer 5 years experience) Tj
0 -20 Td
(Skills: TypeScript Node.js Express PostgreSQL Redis Docker AWS REST) Tj
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

cat << 'EOF' > "$PDF_B"
%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 150 >> stream
BT
/F1 12 Tf
100 700 Td
(Jordan Frontend Developer 2 years experience) Tj
0 -20 Td
(Skills: React Next.js JavaScript Tailwind CSS HTML) Tj
0 -20 Td
(Education: Associate Degree) Tj
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
0000000426 00000 n
trailer << /Root 1 0 R /Size 6 >>
startxref
499
%%EOF
EOF

echo "=== Phase 6 Analysis API & Cross-User Ownership Tests ==="

RAND_A=$RANDOM
RAND_B=$RANDOM
EMAIL_A="analysis_user_a_${RAND_A}@example.com"
EMAIL_B="analysis_user_b_${RAND_B}@example.com"

# 1. Register & Login User A
echo -e "\n1. Register & Login User A..."
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_A\",\"password\":\"password123\"}" > /dev/null
curl -s -c "$COOKIE_A" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_A\",\"password\":\"password123\"}" > /dev/null

# 2. Register & Login User B
echo -e "\n2. Register & Login User B..."
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_B\",\"password\":\"password123\"}" > /dev/null
curl -s -c "$COOKIE_B" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_B\",\"password\":\"password123\"}" > /dev/null

# 3. User A uploads Resume A
echo -e "\n3. User A uploads Resume A..."
UPLOAD_A=$(curl -s -b "$COOKIE_A" -F "resume=@$PDF_A;type=application/pdf" "$BASE_URL/resumes")
RESUME_ID_A=$(echo "$UPLOAD_A" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✓ User A Resume ID: $RESUME_ID_A"

# 4. User B uploads Resume B
echo -e "\n4. User B uploads Resume B..."
UPLOAD_B=$(curl -s -b "$COOKIE_B" -F "resume=@$PDF_B;type=application/pdf" "$BASE_URL/resumes")
RESUME_ID_B=$(echo "$UPLOAD_B" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✓ User B Resume ID: $RESUME_ID_B"

# 5. User A creates Job A
echo -e "\n5. User A creates Job A (Senior Backend Engineer)..."
JOB_RES_A=$(curl -s -b "$COOKIE_A" -X POST "$BASE_URL/jobs" -H "Content-Type: application/json" \
  -d '{"title":"Senior Backend Engineer","company":"TechCorp","description":"5+ years of experience with Node.js, Express, TypeScript, PostgreSQL, Redis, Docker, REST APIs. Bachelor in Computer Science required."}')
JOB_ID_A=$(echo "$JOB_RES_A" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✓ User A Job ID: $JOB_ID_A"

# 6. User B creates Job B
echo -e "\n6. User B creates Job B (Frontend Developer)..."
JOB_RES_B=$(curl -s -b "$COOKIE_B" -X POST "$BASE_URL/jobs" -H "Content-Type: application/json" \
  -d '{"title":"Frontend Developer","company":"DesignStudio","description":"2+ years experience with React, Next.js, JavaScript, Tailwind, CSS, HTML."}')
JOB_ID_B=$(echo "$JOB_RES_B" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✓ User B Job ID: $JOB_ID_B"

# 7. Legitimate Analysis: User A runs analysis with Resume A + Job A
echo -e "\n7. User A analyzes Resume A with Job A (Legitimate Flow)..."
ANALYSIS_RES_A=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X POST "$BASE_URL/analysis" \
  -H "Content-Type: application/json" \
  -d "{\"resumeId\":\"$RESUME_ID_A\",\"jobDescriptionId\":\"$JOB_ID_A\"}")
HTTP_CODE=$(echo "$ANALYSIS_RES_A" | tail -n1)
BODY=$(echo "$ANALYSIS_RES_A" | head -n-1)
echo "HTTP $HTTP_CODE: $BODY"

if [ "$HTTP_CODE" -ne 201 ]; then
  echo "❌ FAILED: Expected 201 Created for Analysis A, got $HTTP_CODE"
  exit 1
fi

ANALYSIS_ID_A=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
SCORE_A=$(echo "$BODY" | grep -o '"score":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Created Analysis ID: $ANALYSIS_ID_A with Score: $SCORE_A"

if [ -z "$SCORE_A" ] || [ "$SCORE_A" -lt 0 ] || [ "$SCORE_A" -gt 100 ]; then
  echo "❌ FAILED: Invalid score received ($SCORE_A)"
  exit 1
fi

# 8. Ownership Attack 1: User A attempts to analyze with User B's Resume B
echo -e "\n8. Ownership Attack 1: User A tries using User B's Resume B..."
ATTACK_1=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X POST "$BASE_URL/analysis" \
  -H "Content-Type: application/json" \
  -d "{\"resumeId\":\"$RESUME_ID_B\",\"jobDescriptionId\":\"$JOB_ID_A\"}")
HTTP_1=$(echo "$ATTACK_1" | tail -n1)
BODY_1=$(echo "$ATTACK_1" | head -n-1)
echo "HTTP $HTTP_1: $BODY_1"

if [ "$HTTP_1" -ne 404 ]; then
  echo "❌ FAILED: Cross-user resume access must return 404! Got $HTTP_1"
  exit 1
fi
echo "✓ Cross-user resume access blocked correctly with 404"

# 9. Ownership Attack 2: User A attempts to analyze with User B's Job B
echo -e "\n9. Ownership Attack 2: User A tries using User B's Job B..."
ATTACK_2=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X POST "$BASE_URL/analysis" \
  -H "Content-Type: application/json" \
  -d "{\"resumeId\":\"$RESUME_ID_A\",\"jobDescriptionId\":\"$JOB_ID_B\"}")
HTTP_2=$(echo "$ATTACK_2" | tail -n1)
BODY_2=$(echo "$ATTACK_2" | head -n-1)
echo "HTTP $HTTP_2: $BODY_2"

if [ "$HTTP_2" -ne 404 ]; then
  echo "❌ FAILED: Cross-user job description access must return 404! Got $HTTP_2"
  exit 1
fi
echo "✓ Cross-user job description access blocked correctly with 404"

# 10. Ownership Attack 3: User B attempts to analyze with User A's Resume A & Job A
echo -e "\n10. Ownership Attack 3: User B tries using User A's Resume A & Job A..."
ATTACK_3=$(curl -s -w "\n%{http_code}" -b "$COOKIE_B" -X POST "$BASE_URL/analysis" \
  -H "Content-Type: application/json" \
  -d "{\"resumeId\":\"$RESUME_ID_A\",\"jobDescriptionId\":\"$JOB_ID_A\"}")
HTTP_3=$(echo "$ATTACK_3" | tail -n1)
echo "HTTP $HTTP_3"

if [ "$HTTP_3" -ne 404 ]; then
  echo "❌ FAILED: User B analyzing User A's data must return 404! Got $HTTP_3"
  exit 1
fi
echo "✓ User B rejected correctly with 404"

# 11. List Analyses Isolation
echo -e "\n11. Verifying List Analyses Scoping..."
LIST_A=$(curl -s -b "$COOKIE_A" "$BASE_URL/analysis")
LIST_B=$(curl -s -b "$COOKIE_B" "$BASE_URL/analysis")

COUNT_A=$(echo "$LIST_A" | grep -o "$ANALYSIS_ID_A" | wc -l)
COUNT_B=$(echo "$LIST_B" | grep -o "$ANALYSIS_ID_A" | wc -l)

if [ "$COUNT_A" -ne 1 ]; then
  echo "❌ FAILED: User A should see their 1 analysis"
  exit 1
fi

if [ "$COUNT_B" -ne 0 ]; then
  echo "❌ FAILED: User B should NOT see User A's analysis"
  exit 1
fi
echo "✓ User A sees their analysis; User B sees 0 analyses (strictly isolated)"

# 12. Single Analysis Retrieval & Breakdown Verification
echo -e "\n12. User A retrieves their analysis detail..."
GET_A=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" "$BASE_URL/analysis/$ANALYSIS_ID_A")
HTTP_GET_A=$(echo "$GET_A" | tail -n1)
BODY_GET_A=$(echo "$GET_A" | head -n-1)

if [ "$HTTP_GET_A" -ne 200 ]; then
  echo "❌ FAILED: User A should get 200 for their analysis. Got $HTTP_GET_A"
  exit 1
fi

if ! echo "$BODY_GET_A" | grep -q '"breakdown"'; then
  echo "❌ FAILED: Analysis response must include breakdown"
  exit 1
fi
echo "✓ Analysis detail returned with score and breakdown"

echo -e "\nUser B tries to retrieve User A's analysis..."
GET_B=$(curl -s -w "\n%{http_code}" -b "$COOKIE_B" "$BASE_URL/analysis/$ANALYSIS_ID_A")
HTTP_GET_B=$(echo "$GET_B" | tail -n1)

if [ "$HTTP_GET_B" -ne 404 ]; then
  echo "❌ FAILED: User B should get 404 accessing User A's analysis. Got $HTTP_GET_B"
  exit 1
fi
echo "✓ User B rejected with 404"

# 13. Cross-User Delete Prevention
echo -e "\n13. User B tries to delete User A's analysis..."
DEL_B=$(curl -s -w "\n%{http_code}" -b "$COOKIE_B" -X DELETE "$BASE_URL/analysis/$ANALYSIS_ID_A")
HTTP_DEL_B=$(echo "$DEL_B" | tail -n1)

if [ "$HTTP_DEL_B" -ne 404 ]; then
  echo "❌ FAILED: User B should get 404 trying to delete User A's analysis. Got $HTTP_DEL_B"
  exit 1
fi
echo "✓ Cross-user delete blocked with 404"

# 14. User A deletes their analysis
echo -e "\n14. User A deletes their analysis..."
DEL_A=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X DELETE "$BASE_URL/analysis/$ANALYSIS_ID_A")
HTTP_DEL_A=$(echo "$DEL_A" | tail -n1)

if [ "$HTTP_DEL_A" -ne 200 ]; then
  echo "❌ FAILED: User A should get 200 deleting their analysis. Got $HTTP_DEL_A"
  exit 1
fi
echo "✓ Analysis deleted successfully"

# Confirm deletion
GET_AFTER_DEL=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" "$BASE_URL/analysis/$ANALYSIS_ID_A")
HTTP_AFTER_DEL=$(echo "$GET_AFTER_DEL" | tail -n1)
if [ "$HTTP_AFTER_DEL" -ne 404 ]; then
  echo "❌ FAILED: Deleted analysis should return 404. Got $HTTP_AFTER_DEL"
  exit 1
fi
echo "✓ Confirmed analysis is gone (404)"

# 15. Unauthenticated rejection
echo -e "\n15. Unauthenticated request to /api/analysis..."
UNAUTH=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/analysis" \
  -H "Content-Type: application/json" \
  -d "{\"resumeId\":\"$RESUME_ID_A\",\"jobDescriptionId\":\"$JOB_ID_A\"}")
HTTP_UNAUTH=$(echo "$UNAUTH" | tail -n1)

if [ "$HTTP_UNAUTH" -ne 401 ]; then
  echo "❌ FAILED: Unauthenticated request should return 401. Got $HTTP_UNAUTH"
  exit 1
fi
echo "✓ Unauthenticated request rejected with 401"

echo -e "\n=============================================="
echo "🎉 ALL PHASE 6 ANALYSIS & OWNERSHIP TESTS PASSED!"
echo "=============================================="
