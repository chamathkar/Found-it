// Automated Verification Test Script for Security, Auth, and Workflow Fixes
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const assert = require('assert');
const http = require('http');

async function runTests() {
  console.log('=== RUNNING VERIFICATION SUITE ===\n');

  // Test 1: JWT Secret Guard (Issue 5)
  console.log('[Test 1] Testing JWT Secret configuration guard...');
  const jwtUtil = require('./src/utils/jwt');
  const originalSecret = process.env.JWT_SECRET;
  
  delete process.env.JWT_SECRET;
  assert.throws(() => {
    jwtUtil.signToken({ id: '123' });
  }, /JWT_SECRET is not configured/, 'Expected signToken to throw when JWT_SECRET is missing');
  process.env.JWT_SECRET = originalSecret;
  
  const token = jwtUtil.signToken({ id: '123' });
  const verified = jwtUtil.verifyToken(token);
  assert.strictEqual(verified.id, '123');
  console.log('✓ Test 1 passed: Fallback JWT secret eliminated and strict check enforced.');

  // Test 2: In-Memory DB Guard in Production (Issue 11)
  console.log('[Test 2] Testing MongoDB In-Memory fallback production guard...');
  const dbModule = require('./src/config/db');
  process.env.NODE_ENV = 'production';
  process.env.MONGODB_URI = 'mongodb://invalid-host-that-fails:27017/testdb';
  
  let productionDbFailed = false;
  try {
    await dbModule.connectDB();
  } catch (err) {
    productionDbFailed = true;
  }
  assert.strictEqual(productionDbFailed, true, 'connectDB must throw in production if primary URI is invalid');
  process.env.NODE_ENV = 'development';
  process.env.MONGODB_URI = '';
  console.log('✓ Test 2 passed: In-memory DB fallback safely blocked in production.');

  // Connect to in-memory DB for HTTP endpoint tests
  await dbModule.connectDB();

  // Start HTTP server for testing
  const app = require('./src/app');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test 3: CORS Rejection (Issue 4)
    console.log('[Test 3] Testing CORS origin rejection...');
    const corsRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://malicious-site.com' },
    });
    const acao = corsRes.headers.get('access-control-allow-origin');
    assert.notStrictEqual(acao, 'http://malicious-site.com', 'Disallowed origin must not receive Access-Control-Allow-Origin header');
    console.log('✓ Test 3 passed: Disallowed origin correctly rejected by CORS.');

    // Test 4: Unauthenticated Item Creation Blocked (Issue 3)
    console.log('[Test 4] Testing Unauthenticated Item Creation...');
    const unauthItemRes = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Lost Backpack',
        description: 'Black backpack',
        type: 'lost',
        location: 'Library',
        contactName: 'John',
        contactEmail: 'john@example.com',
      }),
    });
    assert.strictEqual(unauthItemRes.status, 401, 'Anonymous item reporting must be rejected with 401');
    console.log('✓ Test 4 passed: Unauthenticated item creation returns HTTP 401.');

    // Test 5: Unauthenticated Claim Creation Blocked (Issue 2)
    console.log('[Test 5] Testing Unauthenticated Claim Submission...');
    const unauthClaimRes = await fetch(`${baseUrl}/api/items/507f1f77bcf86cd799439011/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimantName: 'Jane',
        claimantEmail: 'jane@example.com',
        proofDetails: 'Has a sticker on it',
      }),
    });
    assert.strictEqual(unauthClaimRes.status, 401, 'Anonymous claim creation must be rejected with 401');
    console.log('✓ Test 5 passed: Unauthenticated claim submission returns HTTP 401.');

    // Test 6: Unauthenticated Status Update Blocked (Issue 1 & 8)
    console.log('[Test 6] Testing Unauthenticated Status Update...');
    const unauthStatusRes = await fetch(`${baseUrl}/api/items/507f1f77bcf86cd799439011/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'claimed' }),
    });
    assert.strictEqual(unauthStatusRes.status, 401, 'Anonymous status update must be rejected with 401');
    console.log('✓ Test 6 passed: Unauthenticated status update returns HTTP 401.');

    // Test 7: Validation Layer (Issue 9)
    console.log('[Test 7] Testing Input Validation with express-validator...');
    const invalidRegisterRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: 'not-an-email',
        password: '123',
      }),
    });
    assert.strictEqual(invalidRegisterRes.status, 400, 'Invalid registration input must return HTTP 400');
    const invalidBody = await invalidRegisterRes.json();
    assert.ok(invalidBody.errors && invalidBody.errors.length > 0, 'Must return formatted errors array');
    console.log('✓ Test 7 passed: Request validation triggers HTTP 400 with formatted error details.');

    // Test 8: Special Characters in Search (Issue 10 - Regex Escaping)
    console.log('[Test 8] Testing Special Character Regex Escaping in Search...');
    const searchWithRegexSpecialChars = await fetch(`${baseUrl}/api/items?search=%28%28%5Ba-z%2A%2B%3F`);
    assert.notStrictEqual(searchWithRegexSpecialChars.status, 500, 'Unescaped regex query must not crash server with 500');
    assert.strictEqual(searchWithRegexSpecialChars.status, 200, 'Escaped regex search must succeed with HTTP 200');
    console.log('✓ Test 8 passed: Special characters in search query are escaped and handled safely.');

    // Test 9: Complete Claim & Ownership Workflow (Issues 1, 2, 7, 8)
    console.log('[Test 9] Testing Complete Claim & Status Workflow with Auth & Ownership...');
    // Register user 1 (Reporter/Finder)
    const user1Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Finder',
        email: 'alice@campus.edu',
        password: 'password123',
      }),
    });
    const user1Data = await user1Res.json();
    const token1 = user1Data.token;

    // Register user 2 (Claimant)
    const user2Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Claimant',
        email: 'bob@campus.edu',
        password: 'password123',
      }),
    });
    const user2Data = await user2Res.json();
    const token2 = user2Data.token;

    // Alice reports a found item
    const createItemRes = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        title: 'Found Blue Hydro Flask',
        description: '32oz water bottle with astronaut sticker',
        type: 'found',
        location: 'Student Center 2nd Floor',
        contactName: 'Alice Finder',
        contactEmail: 'alice@campus.edu',
      }),
    });
    const createItemData = await createItemRes.json();
    assert.strictEqual(createItemRes.status, 201);
    const itemId = createItemData.data._id;
    assert.strictEqual(createItemData.data.status, 'open');

    // Bob claims the item
    const claimRes = await fetch(`${baseUrl}/api/items/${itemId}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({
        claimantName: 'Bob Claimant',
        claimantEmail: 'bob@campus.edu',
        claimantPhone: '555-1234',
        proofDetails: 'It has a scratched NASA logo on the bottom',
      }),
    });
    const claimData = await claimRes.json();
    assert.strictEqual(claimRes.status, 201);
    const claimId = claimData.data._id;

    // Check that item status is STILL open (Issue 7 fix)
    const checkItemRes1 = await fetch(`${baseUrl}/api/items/${itemId}`);
    const checkItemData1 = await checkItemRes1.json();
    assert.strictEqual(checkItemData1.data.status, 'open', 'Item must remain open after claim is submitted pending review');
    console.log('  -> Claim submitted: item remains open as expected.');

    // Non-owner (Bob) attempts to update item status -> must be forbidden (Issues 1 & 8)
    const unauthUpdateRes = await fetch(`${baseUrl}/api/items/${itemId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({ status: 'claimed' }),
    });
    assert.strictEqual(unauthUpdateRes.status, 403, 'Non-owner updating item status must return 403 Forbidden');
    console.log('  -> Non-owner status update correctly rejected with 403 Forbidden.');

    // Owner (Alice) approves the claim
    const reviewRes = await fetch(`${baseUrl}/api/items/${itemId}/claims/${claimId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ status: 'approved' }),
    });
    const reviewData = await reviewRes.json();
    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewData.data.claim.status, 'approved');
    assert.strictEqual(reviewData.data.itemStatus, 'claimed');

    // Verify item is now claimed
    const checkItemRes2 = await fetch(`${baseUrl}/api/items/${itemId}`);
    const checkItemData2 = await checkItemRes2.json();
    assert.strictEqual(checkItemData2.data.status, 'claimed');
    console.log('  -> Owner approved claim: claim = approved and item = claimed.');

    console.log('✓ Test 9 passed: Complete claim lifecycle and ownership security verified.');

  } finally {
    server.close();
    await dbModule.disconnectDB();
  }

  console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
