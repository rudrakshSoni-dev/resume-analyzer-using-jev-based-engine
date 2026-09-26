#!/bin/bash
BASE_URL="http://localhost:3001/api"
COOKIE_A="/tmp/cookie-a.txt"
COOKIE_B="/tmp/cookie-b.txt"
SAMPLE_PDF="/tmp/sample-resume.pdf"
SAMPLE_TXT="/tmp/sample-file.txt"

# Cleanup previous files
rm -f "$COOKIE_A" "$COOKIE_B" "$SAMPLE_PDF" "$SAMPLE_TXT"

echo "=== Creating test files ==="
cat << 'EOF' > "$SAMPLE_PDF"
%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 44 >> stream
BT
/F1 24 Tf
100 700 Td
(Jane Doe Software Engineer) Tj
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
0000000320 00000 n
trailer << /Root 1 0 R /Size 6 >>
startxref
393
%%EOF
EOF

echo "This is not a PDF" > "$SAMPLE_TXT"

echo "=== Phase 3 Resume Upload & Ownership Tests ==="

RAND_A=$RANDOM
RAND_B=$RANDOM
EMAIL_A="user_a_${RAND_A}@example.com"
EMAIL_B="user_b_${RAND_B}@example.com"

# 1. Register & Login User A
echo -e "\n1. Register & Login User A..."
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_A\",\"password\":\"password123\"}" > /dev/null
curl -s -c "$COOKIE_A" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_A\",\"password\":\"password123\"}" > /dev/null

# 2. Register & Login User B
echo -e "\n2. Register & Login User B..."
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_B\",\"password\":\"password123\"}" > /dev/null
curl -s -c "$COOKIE_B" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL_B\",\"password\":\"password123\"}" > /dev/null

# 3. User A uploads PDF resume
echo -e "\n3. User A uploads PDF resume..."
UPLOAD_RES=$(curl -s -b "$COOKIE_A" -X POST "$BASE_URL/resumes" -F "resume=@$SAMPLE_PDF;type=application/pdf")
echo "Upload response: $UPLOAD_RES"

RESUME_ID=$(echo "$UPLOAD_RES" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$RESUME_ID" ]; then
  echo "❌ FAILED to extract resume ID from upload response!"
  exit 1
fi
echo "✓ Uploaded resume ID: $RESUME_ID"

# 4. User A lists resumes
echo -e "\n4. User A lists resumes..."
LIST_A=$(curl -s -b "$COOKIE_A" -X GET "$BASE_URL/resumes")
echo "User A resumes: $LIST_A"
if echo "$LIST_A" | grep -q "$RESUME_ID"; then
  echo "✓ User A sees their uploaded resume"
else
  echo "❌ User A does not see their resume!"
  exit 1
fi

# 5. User B lists resumes (should be empty / not contain User A's resume)
echo -e "\n5. User B lists resumes (isolation check)..."
LIST_B=$(curl -s -b "$COOKIE_B" -X GET "$BASE_URL/resumes")
echo "User B resumes: $LIST_B"
if echo "$LIST_B" | grep -q "$RESUME_ID"; then
  echo "❌ OWNERSHIP LEAK: User B sees User A's resume!"
  exit 1
else
  echo "✓ User B does not see User A's resume"
fi

# 6. User A gets resume by ID
echo -e "\n6. User A fetches own resume by ID..."
GET_A=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X GET "$BASE_URL/resumes/$RESUME_ID")
HTTP_CODE=$(echo "$GET_A" | tail -n1)
BODY=$(echo "$GET_A" | head -n-1)
echo "HTTP $HTTP_CODE: $BODY"
if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✓ User A successfully retrieved resume"
else
  echo "❌ User A failed to retrieve own resume!"
  exit 1
fi

# 7. User B attempts to get User A's resume by ID (ownership boundary)
echo -e "\n7. User B fetches User A's resume by ID (cross-user check)..."
GET_B=$(curl -s -w "\n%{http_code}" -b "$COOKIE_B" -X GET "$BASE_URL/resumes/$RESUME_ID")
HTTP_CODE_B=$(echo "$GET_B" | tail -n1)
BODY_B=$(echo "$GET_B" | head -n-1)
echo "HTTP $HTTP_CODE_B: $BODY_B"
if [ "$HTTP_CODE_B" -eq 404 ]; then
  echo "✓ Ownership check PASSED: User B cannot fetch User A's resume (HTTP 404)"
else
  echo "❌ OWNERSHIP VIOLATION: Expected 404, got $HTTP_CODE_B!"
  exit 1
fi

# 8. User B attempts to delete User A's resume by ID
echo -e "\n8. User B attempts to delete User A's resume (cross-user check)..."
DEL_B=$(curl -s -w "\n%{http_code}" -b "$COOKIE_B" -X DELETE "$BASE_URL/resumes/$RESUME_ID")
HTTP_CODE_DEL_B=$(echo "$DEL_B" | tail -n1)
echo "HTTP $HTTP_CODE_DEL_B"
if [ "$HTTP_CODE_DEL_B" -eq 404 ]; then
  echo "✓ Ownership check PASSED: User B cannot delete User A's resume (HTTP 404)"
else
  echo "❌ OWNERSHIP VIOLATION: Expected 404, got $HTTP_CODE_DEL_B!"
  exit 1
fi

# 9. Non-PDF upload rejection test
echo -e "\n9. Non-PDF file upload rejection test..."
BAD_UPLOAD=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X POST "$BASE_URL/resumes" -F "resume=@$SAMPLE_TXT;type=text/plain")
HTTP_CODE_BAD=$(echo "$BAD_UPLOAD" | tail -n1)
BODY_BAD=$(echo "$BAD_UPLOAD" | head -n-1)
echo "HTTP $HTTP_CODE_BAD: $BODY_BAD"
if [ "$HTTP_CODE_BAD" -eq 400 ]; then
  echo "✓ Correctly rejected non-PDF file upload"
else
  echo "❌ Failed to reject non-PDF file!"
  exit 1
fi

# 10. Unauthenticated request rejection
echo -e "\n10. Unauthenticated upload test..."
NOAUTH_UPLOAD=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/resumes" -F "resume=@$SAMPLE_PDF;type=application/pdf")
HTTP_CODE_NOAUTH=$(echo "$NOAUTH_UPLOAD" | tail -n1)
echo "HTTP $HTTP_CODE_NOAUTH"
if [ "$HTTP_CODE_NOAUTH" -eq 401 ]; then
  echo "✓ Correctly rejected unauthenticated upload"
else
  echo "❌ Failed to reject unauthenticated request!"
  exit 1
fi

# 11. User A deletes own resume
echo -e "\n11. User A deletes own resume..."
DEL_A=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X DELETE "$BASE_URL/resumes/$RESUME_ID")
HTTP_CODE_DEL_A=$(echo "$DEL_A" | tail -n1)
echo "HTTP $HTTP_CODE_DEL_A"
if [ "$HTTP_CODE_DEL_A" -eq 200 ]; then
  echo "✓ User A successfully deleted resume"
else
  echo "❌ Failed to delete resume!"
  exit 1
fi

# 12. Confirm deleted resume cannot be retrieved
echo -e "\n12. Confirm deleted resume is gone..."
GET_DELETED=$(curl -s -w "\n%{http_code}" -b "$COOKIE_A" -X GET "$BASE_URL/resumes/$RESUME_ID")
HTTP_CODE_DEL=$(echo "$GET_DELETED" | tail -n1)
if [ "$HTTP_CODE_DEL" -eq 404 ]; then
  echo "✓ Resume verified deleted (HTTP 404)"
fi

# Cleanup
rm -f "$COOKIE_A" "$COOKIE_B" "$SAMPLE_PDF" "$SAMPLE_TXT"
echo -e "\n=== All Phase 3 Resume Tests Passed Successfully! ==="
