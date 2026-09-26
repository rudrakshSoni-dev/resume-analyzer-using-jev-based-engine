#!/bin/bash
BASE_URL="http://localhost:3001/api/auth"
COOKIE_FILE="/tmp/auth-test-cookies.txt"

echo "=== Phase 2 Authentication Tests ==="

# Test 1: Register new user
echo -e "\n1. Register new user..."
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')
echo "$REGISTER_RESPONSE"
if echo "$REGISTER_RESPONSE" | grep -q "passwordHash"; then
  echo "❌ SECURITY VIOLATION: passwordHash found in register response!"
  exit 1
fi

# Test 2: Login with correct credentials
echo -e "\n2. Login with correct credentials..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -c "$COOKIE_FILE" -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')
echo "$LOGIN_RESPONSE"
if echo "$LOGIN_RESPONSE" | grep -q "passwordHash"; then
  echo "❌ SECURITY VIOLATION: passwordHash found in login response!"
  exit 1
fi

# Test 3: Access /me with valid token
echo -e "\n3. Access /me with valid token..."
ME_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" "$BASE_URL/me")
echo "$ME_RESPONSE"
if echo "$ME_RESPONSE" | grep -q "passwordHash"; then
  echo "❌ SECURITY VIOLATION: passwordHash found in /me response!"
  exit 1
fi

# Test 4: Access /me without token (should fail)
echo -e "\n4. Access /me without token..."
NO_AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/me")
echo "$NO_AUTH_RESPONSE"
if echo "$NO_AUTH_RESPONSE" | grep -q "401"; then
  echo "✓ Correctly rejected unauthenticated request"
fi

# Test 5: Logout
echo -e "\n5. Logout..."
LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" -X POST "$BASE_URL/logout")
echo "$LOGOUT_RESPONSE"

# Test 6: Login with wrong password
echo -e "\n6. Login with wrong password..."
WRONG_PW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}')
echo "$WRONG_PW"
if echo "$WRONG_PW" | grep -q "401"; then
  echo "✓ Correctly rejected wrong password"
fi

# Test 7: Register duplicate email
echo -e "\n7. Register duplicate email..."
DUPLICATE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')
echo "$DUPLICATE"
if echo "$DUPLICATE" | grep -q "409"; then
  echo "✓ Correctly rejected duplicate email"
fi

# Cleanup
rm -f "$COOKIE_FILE"
echo -e "\n=== Tests complete ==="
