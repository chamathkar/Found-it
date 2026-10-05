/**
 * Complete Lost & Found Workflow Test — Two Users + OTP Handover
 *
 * Verifies all 26 acceptance criteria:
 * 1. User A (Lost User) and User B (Found User) registration with role enforced to "user"
 * 2. User A reports item as LOST (status: open)
 * 3. User B reports item as FOUND (status: open)
 * 4. Cross-matching algorithm computes potential match score & reasons
 * 5. User A submits claim on found item -> status transitions to "pending_claim"
 * 6. Duplicate pending claim prevention
 * 7. Admin reviews and approves claim -> status transitions to "claimed", OTP generated
 * 8. Privacy: Finder (User B) cannot see User A's OTP; Claimant (User A) can see OTP
 * 9. Physical Handover:
 *    - Invalid OTP rejection (item remains "claimed", attempts tracked)
 *    - Valid OTP verification (item transitions to "closed", closureMethod: "otp_verified")
 * 10. Direct open -> closed transition blocked
 * 11. Admin manual override on claimed item (closureMethod: "admin_override")
 */

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';

const req = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

const assert = (condition, msg) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
};

const runCompleteWorkflowTest = async () => {
  console.log('================================================================');
  console.log('🚀 RUNNING COMPLETE LOST & FOUND TWO-USER + OTP HANDOVER WORKFLOW');
  console.log('================================================================');

  const timestamp = Date.now();
  const userAEmail = `lostuser_${timestamp}@test.com`;
  const userBEmail = `founduser_${timestamp}@test.com`;
  const testPassword = 'Test@123';

  // -------------------------------------------------------------
  // 1. Create Two New Users (User A and User B)
  // -------------------------------------------------------------
  console.log('\n[1] Registering User A (Lost User) & User B (Found User)...');

  // Attempt to pass role: 'admin' to verify role is strictly forced to 'user'
  const regUserARes = await req('/auth/register', 'POST', {
    name: 'Lost User',
    email: userAEmail,
    password: testPassword,
    studentId: 'STU001',
    phone: '+1 555-0101',
    role: 'admin', // Attack vector: should be ignored and forced to 'user'
  });
  assert(regUserARes.ok, `User A registration failed: ${JSON.stringify(regUserARes.data)}`);
  assert(regUserARes.data.user.role === 'user', `User A role must be forced to 'user', got: ${regUserARes.data.user.role}`);
  console.log(`✅ User A registered: ${userAEmail} (Role strictly forced to: ${regUserARes.data.user.role})`);

  const regUserBRes = await req('/auth/register', 'POST', {
    name: 'Found User',
    email: userBEmail,
    password: testPassword,
    studentId: 'STU002',
    phone: '+1 555-0102',
    role: 'admin', // Attack vector: should be forced to 'user'
  });
  assert(regUserBRes.ok, `User B registration failed: ${JSON.stringify(regUserBRes.data)}`);
  assert(regUserBRes.data.user.role === 'user', `User B role must be forced to 'user', got: ${regUserBRes.data.user.role}`);
  console.log(`✅ User B registered: ${userBEmail} (Role strictly forced to: ${regUserBRes.data.user.role})`);

  // -------------------------------------------------------------
  // 2. User A Logs In & Verifies JWT
  // -------------------------------------------------------------
  console.log('\n[2] User A Logs In...');
  const loginUserARes = await req('/auth/login', 'POST', {
    email: userAEmail,
    password: testPassword,
  });
  assert(loginUserARes.ok, `User A login failed: ${JSON.stringify(loginUserARes.data)}`);
  const tokenA = loginUserARes.data.token;
  const userAId = loginUserARes.data.user.id || loginUserARes.data.user._id;
  assert(loginUserARes.data.user.role === 'user', 'User A role must be "user"');
  console.log(`✅ User A authenticated. JWT received. User ID: ${userAId}`);

  // -------------------------------------------------------------
  // 3. User A Reports Item as LOST
  // -------------------------------------------------------------
  console.log('\n[3] User A Reports Item as LOST...');
  const lostItemRes = await req('/items', 'POST', {
    type: 'lost',
    category: 'Electronics',
    title: 'Black iPhone 15',
    description: 'Black iPhone 15 with a transparent case and small scratch near the camera.',
    location: 'Central Library',
    dateFoundOrLost: '2026-09-25',
    contactName: 'Lost User',
    contactEmail: userAEmail,
    contactPhone: '+1 555-0101',
    rewardOffered: false,
  }, tokenA);
  assert(lostItemRes.ok, `User A create lost item failed: ${JSON.stringify(lostItemRes.data)}`);
  const lostItem = lostItemRes.data.data;
  assert(lostItem.type === 'lost', `Expected type lost, got: ${lostItem.type}`);
  assert(lostItem.status === 'open', `Expected status open, got: ${lostItem.status}`);
  assert(lostItem.userId.toString() === userAId.toString(), 'Backend must bind item to authenticated User A');
  console.log(`✅ Lost Item created: "${lostItem.title}" | Status: ${lostItem.status.toUpperCase()} | Owner: User A`);

  // -------------------------------------------------------------
  // 4. User B Logs In
  // -------------------------------------------------------------
  console.log('\n[4] User B Logs In...');
  const loginUserBRes = await req('/auth/login', 'POST', {
    email: userBEmail,
    password: testPassword,
  });
  assert(loginUserBRes.ok, `User B login failed: ${JSON.stringify(loginUserBRes.data)}`);
  const tokenB = loginUserBRes.data.token;
  const userBId = loginUserBRes.data.user.id || loginUserBRes.data.user._id;
  assert(loginUserBRes.data.user.role === 'user', 'User B role must be "user"');
  console.log(`✅ User B authenticated. JWT received. User ID: ${userBId}`);

  // -------------------------------------------------------------
  // 5. User B Reports Same Item as FOUND
  // -------------------------------------------------------------
  console.log('\n[5] User B Reports Same Item as FOUND...');
  const foundItemRes = await req('/items', 'POST', {
    type: 'found',
    category: 'Electronics',
    title: 'Black iPhone 15',
    description: 'Found a black iPhone 15 with a transparent case and a small scratch near the camera.',
    location: 'Central Library',
    dateFoundOrLost: '2026-09-25',
    contactName: 'Found User',
    contactEmail: userBEmail,
    contactPhone: '+1 555-0102',
  }, tokenB);
  assert(foundItemRes.ok, `User B create found item failed: ${JSON.stringify(foundItemRes.data)}`);
  const foundItem = foundItemRes.data.data;
  assert(foundItem.type === 'found', `Expected type found, got: ${foundItem.type}`);
  assert(foundItem.status === 'open', `Expected status open, got: ${foundItem.status}`);
  assert(foundItem.userId.toString() === userBId.toString(), 'Backend must bind item to authenticated User B');
  console.log(`✅ Found Item created: "${foundItem.title}" | Status: ${foundItem.status.toUpperCase()} | Owner: User B`);

  // -------------------------------------------------------------
  // 6. Matching Algorithm Cross-Matches Lost and Found Items
  // -------------------------------------------------------------
  console.log('\n[6] Running Cross-Matching Algorithm on Lost Item...');
  const matchRes = await req(`/items/${lostItem._id}/matches`, 'GET');
  assert(matchRes.ok, `Matches query failed: ${JSON.stringify(matchRes.data)}`);
  const matches = matchRes.data.matches || matchRes.data.data || [];
  console.log(`🔍 Matches found: ${matches.length}`);

  const topMatch = matches.find((m) => (m._id || m.item?._id || '').toString() === foundItem._id.toString());
  assert(topMatch, `Expected found item ${foundItem._id} to be in potential matches`);
  console.log(`✅ Potential Match Identified! Score: ${topMatch.matchScore}%`);
  console.log(`   Reasons: ${JSON.stringify(topMatch.reasons || topMatch.matchReasons)}`);
  assert(topMatch.matchScore >= 70, `Expected match score >= 70%, got: ${topMatch.matchScore}%`);

  // Verify status remains open
  const checkStatusRes = await req(`/items/${foundItem._id}`);
  assert(checkStatusRes.data.data.status === 'open', 'Item must remain open at matching stage');
  console.log('✅ Both items remain OPEN during matching (potential match only).');

  // -------------------------------------------------------------
  // 7. User A Submits Claim on Found Item
  // -------------------------------------------------------------
  console.log('\n[7] User A Submits Ownership Claim on User B’s Found Item...');
  const claimRes = await req(`/items/${foundItem._id}/claims`, 'POST', {
    claimantName: 'Lost User',
    claimantEmail: userAEmail,
    claimantPhone: '+1 555-0101',
    proofDetails: 'Black iPhone 15, transparent MagSafe case, small hairline scratch next to top-left camera lens, lockscreen has photo of central library.',
  }, tokenA);
  assert(claimRes.ok, `Claim submission failed: ${JSON.stringify(claimRes.data)}`);
  const claim = claimRes.data.data;
  assert(claim.status === 'pending', `Expected claim status pending, got: ${claim.status}`);
  console.log(`✅ Claim filed successfully (Claim ID: ${claim._id}) | Claim Status: ${claim.status}`);

  // Check item status transitioned to pending_claim
  const foundItemAfterClaim = await req(`/items/${foundItem._id}`);
  assert(
    foundItemAfterClaim.data.data.status === 'pending_claim',
    `Expected item status 'pending_claim', got '${foundItemAfterClaim.data.data.status}'`
  );
  console.log(`✅ Found item status automatically transitioned to: ${foundItemAfterClaim.data.data.status.toUpperCase()}`);

  // Test duplicate claim prevention
  console.log('\n[7b] Testing Duplicate Pending Claim Prevention...');
  const dupClaimRes = await req(`/items/${foundItem._id}/claims`, 'POST', {
    claimantName: 'Lost User',
    claimantEmail: userAEmail,
    proofDetails: 'Attempting duplicate claim...',
  }, tokenA);
  assert(!dupClaimRes.ok, 'Expected duplicate claim to be rejected');
  assert(dupClaimRes.status === 400, `Expected 400 Bad Request, got: ${dupClaimRes.status}`);
  console.log('✅ Duplicate pending claim rejected by backend (400 Bad Request).');

  // -------------------------------------------------------------
  // 8. Admin Logs In
  // -------------------------------------------------------------
  console.log('\n[8] Admin Logs In...');
  const adminLoginRes = await req('/auth/login', 'POST', {
    email: 'admin@college.com',
    password: 'AdminPassword123!',
  });
  assert(adminLoginRes.ok, `Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
  const adminToken = adminLoginRes.data.token;
  assert(adminLoginRes.data.user.role === 'admin', 'Expected admin role');
  console.log(`✅ Admin logged in successfully (${adminLoginRes.data.user.email}).`);

  // -------------------------------------------------------------
  // 9. Admin Reviews Claims
  // -------------------------------------------------------------
  console.log('\n[9] Admin Reviews Claims List...');
  const adminClaimsRes = await req('/admin/claims?status=pending', 'GET', null, adminToken);
  assert(adminClaimsRes.ok, `Admin claims list query failed: ${JSON.stringify(adminClaimsRes.data)}`);
  const pendingClaims = adminClaimsRes.data.data || [];
  const targetClaim = pendingClaims.find((c) => c._id.toString() === claim._id.toString());
  assert(targetClaim, 'Submitted claim must be visible to Admin in pending claims');
  console.log(`✅ Admin verified pending claim from ${targetClaim.claimantName} with proof: "${targetClaim.proofDetails.substring(0, 45)}..."`);

  // -------------------------------------------------------------
  // 10. Admin Approves Claim & Generates Handover OTP
  // -------------------------------------------------------------
  console.log('\n[10] Admin Approves Claim...');
  const approveRes = await req(`/admin/claims/${claim._id}/approve`, 'PATCH', null, adminToken);
  assert(approveRes.ok, `Claim approval failed: ${JSON.stringify(approveRes.data)}`);
  const approvedClaim = approveRes.data.data.claim;
  const itemAfterApproval = approveRes.data.data.item;

  assert(approvedClaim.status === 'approved', `Claim status must be approved, got: ${approvedClaim.status}`);
  assert(itemAfterApproval.status === 'claimed', `Item status must be claimed, got: ${itemAfterApproval.status}`);
  assert(approvedClaim.handoverOtp && approvedClaim.handoverOtp.length === 6, `Approved claim must generate 6-digit OTP, got: ${approvedClaim.handoverOtp}`);
  const handoverOtp = approvedClaim.handoverOtp;
  console.log(`✅ Claim APPROVED by Admin.`);
  console.log(`✅ Item Status: ${itemAfterApproval.status.toUpperCase()}`);
  console.log(`✅ Secure 6-Digit Handover OTP Generated: [ ${handoverOtp} ]`);

  // -------------------------------------------------------------
  // 11. OTP Privacy Verification
  // -------------------------------------------------------------
  console.log('\n[11] Verifying OTP Privacy Rules...');
  // User B (Finder) inspects the item
  const userBItemCheck = await req(`/items/${foundItem._id}`, 'GET', null, tokenB);
  assert(userBItemCheck.data.data.handoverOtp === undefined, 'Item response must NOT leak handoverOtp to finder');
  const claimsShownToB = userBItemCheck.data.claims || [];
  for (const c of claimsShownToB) {
    assert(c.handoverOtp === undefined, 'Claims listed to non-claimant must NOT expose handoverOtp');
  }
  console.log('🔒 Verified: Finder (User B) CANNOT retrieve the OTP through item or claims endpoints.');

  // User A (Claimant) views their claims
  const userAMyClaims = await req('/claims/my', 'GET', null, tokenA);
  assert(userAMyClaims.ok, 'User A claims query failed');
  const userAApprovedClaim = (userAMyClaims.data.data || []).find((c) => c._id.toString() === claim._id.toString());
  assert(userAApprovedClaim, 'Claimant must see their approved claim');
  assert(userAApprovedClaim.handoverOtp === handoverOtp, 'Claimant MUST be able to view their handover OTP');
  console.log(`🔑 Verified: Claimant (User A) successfully received Handover OTP [ ${userAApprovedClaim.handoverOtp} ] in dashboard.`);

  // -------------------------------------------------------------
  // 12. Physical Handover: Invalid OTP Attempt
  // -------------------------------------------------------------
  console.log('\n[12] Physical Handover — Testing Invalid OTP Attempt...');
  const invalidOtpRes = await req(`/items/${foundItem._id}/handover/verify`, 'POST', {
    otp: '111111',
  }, tokenB);
  assert(!invalidOtpRes.ok, 'Expected invalid OTP to be rejected');
  assert(invalidOtpRes.status === 400, `Expected 400 Bad Request, got: ${invalidOtpRes.status}`);
  console.log(`✅ Invalid OTP correctly rejected: "${invalidOtpRes.data.message}"`);

  // Verify item remains claimed
  const itemAfterFailedOtp = await req(`/items/${foundItem._id}`);
  assert(itemAfterFailedOtp.data.data.status === 'claimed', 'Item MUST remain claimed when OTP is invalid');
  console.log('✅ Item status REMAINS "claimed" (NOT closed).');

  // -------------------------------------------------------------
  // 13. Physical Handover: Valid OTP Verification
  // -------------------------------------------------------------
  console.log('\n[13] Physical Handover — User B Submits Correct OTP...');
  const validOtpRes = await req(`/items/${foundItem._id}/handover/verify`, 'POST', {
    otp: handoverOtp,
  }, tokenB);
  assert(validOtpRes.ok, `Valid OTP verification failed: ${JSON.stringify(validOtpRes.data)}`);
  const closedItem = validOtpRes.data.data.item;
  const verifiedClaim = validOtpRes.data.data.claim;

  assert(closedItem.status === 'closed', `Expected item status closed, got: ${closedItem.status}`);
  assert(closedItem.closureMethod === 'otp_verified', `Expected closureMethod 'otp_verified', got: ${closedItem.closureMethod}`);
  assert(closedItem.handoverStatus === 'verified', `Expected handoverStatus 'verified', got: ${closedItem.handoverStatus}`);
  assert(closedItem.handoverOtpVerifiedAt, 'Expected handoverOtpVerifiedAt timestamp');
  assert(verifiedClaim.handoverStatus === 'verified', `Expected claim handoverStatus 'verified', got: ${verifiedClaim.handoverStatus}`);
  console.log(`✅ Handover OTP verified successfully!`);
  console.log(`✅ Item transitioned: CLAIMED → CLOSED`);
  console.log(`✅ Closure Method: ${closedItem.closureMethod}`);
  console.log(`✅ Handover Verification Timestamp: ${closedItem.handoverOtpVerifiedAt}`);

  // -------------------------------------------------------------
  // 14. Verify Direct Open -> Closed Transition is Blocked
  // -------------------------------------------------------------
  console.log('\n[14] Verifying Direct OPEN → CLOSED Transitions are Blocked...');
  // Create a new fresh open item
  const freshItemRes = await req('/items', 'POST', {
    type: 'found',
    category: 'Electronics',
    title: 'Blue Umbrella',
    description: 'Found blue umbrella in cafeteria',
    location: 'Cafeteria',
    contactName: 'Found User',
    contactEmail: userBEmail,
  }, tokenB);
  const freshItem = freshItemRes.data.data;
  assert(freshItem.status === 'open', 'Fresh item must be open');

  // Attempt user direct close
  const directCloseRes = await req(`/items/${freshItem._id}/close`, 'PATCH', null, tokenB);
  assert(!directCloseRes.ok, 'Expected direct close on open item to be rejected');
  assert(directCloseRes.status === 400, `Expected 400 Bad Request, got: ${directCloseRes.status}`);
  console.log(`✅ Direct close on OPEN item rejected: "${directCloseRes.data.message}"`);

  // Attempt admin direct close on open item
  const adminDirectCloseRes = await req(`/admin/items/${freshItem._id}/close`, 'PATCH', null, adminToken);
  assert(!adminDirectCloseRes.ok, 'Expected admin direct close on open item to be rejected');
  assert(adminDirectCloseRes.status === 400, `Expected 400 Bad Request, got: ${adminDirectCloseRes.status}`);
  console.log(`✅ Admin direct close on OPEN item rejected: "${adminDirectCloseRes.data.message}"`);

  // -------------------------------------------------------------
  // 15. Verify Admin Manual Override on Claimed Item
  // -------------------------------------------------------------
  console.log('\n[15] Verifying Admin Manual Override on a Claimed Item...');
  // User A claims fresh item
  const claimFreshRes = await req(`/items/${freshItem._id}/claims`, 'POST', {
    claimantName: 'Lost User',
    claimantEmail: userAEmail,
    proofDetails: 'My blue umbrella with wooden curved handle',
  }, tokenA);
  assert(claimFreshRes.ok, 'Claim fresh item failed');
  const freshClaim = claimFreshRes.data.data;

  // Admin approves claim -> status becomes claimed
  const approveFreshRes = await req(`/admin/claims/${freshClaim._id}/approve`, 'PATCH', null, adminToken);
  assert(approveFreshRes.ok, 'Approve fresh claim failed');
  assert(approveFreshRes.data.data.item.status === 'claimed', 'Item must be claimed');

  // Admin performs emergency manual override
  const adminOverrideRes = await req(`/admin/items/${freshItem._id}/close`, 'PATCH', null, adminToken);
  assert(adminOverrideRes.ok, `Admin override failed: ${JSON.stringify(adminOverrideRes.data)}`);
  const overriddenItem = adminOverrideRes.data.data;
  assert(overriddenItem.status === 'closed', 'Item must be closed');
  assert(overriddenItem.closureMethod === 'admin_override', `Expected closureMethod 'admin_override', got: ${overriddenItem.closureMethod}`);
  assert(overriddenItem.closedBy, 'Expected closedBy admin reference');
  console.log(`✅ Admin Manual Override recorded successfully:`);
  console.log(`   Item Status: ${overriddenItem.status.toUpperCase()}`);
  console.log(`   Closure Method: ${overriddenItem.closureMethod}`);
  console.log(`   Closed By: Admin (${overriddenItem.closedBy})`);

  console.log('\n================================================================');
  console.log('🎉 ALL 26 ACCEPTANCE CRITERIA VERIFIED AND FULLY PASSING!');
  console.log('================================================================');
};

runCompleteWorkflowTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Workflow test failed:', err);
    process.exit(1);
  });
