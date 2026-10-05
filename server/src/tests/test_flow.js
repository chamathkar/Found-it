const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

async function req(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('--- FOUND IT SPECIFICATION TEST SUITE ---');

  let adminToken = '';
  let userToken = '';
  let user2Token = '';
  let studentUser = null;
  let adminUser = null;

  // 1. Single Login API & JWT role verification
  console.log('\n[1] Testing Authentication & JWT payload...');
  const adminLoginRes = await req('/auth/login', {
    method: 'POST',
    body: { email: 'admin@college.com', password: 'AdminPassword123!' }
  });
  if (!adminLoginRes.ok) throw new Error('Admin login failed: ' + JSON.stringify(adminLoginRes.data));
  adminToken = adminLoginRes.data.token;
  adminUser = adminLoginRes.data.user;
  if (adminUser.role !== 'admin') throw new Error('Admin role mismatch');
  console.log('✅ Admin login succeeded. Role:', adminUser.role);

  const tokenPayload = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString());
  if (tokenPayload.role !== 'admin' || !tokenPayload.id) {
    throw new Error('Admin token payload missing fields: ' + JSON.stringify(tokenPayload));
  }
  console.log('✅ Admin JWT contains id and role=admin:', tokenPayload);

  const userLoginRes = await req('/auth/login', {
    method: 'POST',
    body: { email: 'sarah.j@college.com', password: 'Password123!' }
  });
  if (!userLoginRes.ok) throw new Error('User login failed: ' + JSON.stringify(userLoginRes.data));
  userToken = userLoginRes.data.token;
  studentUser = userLoginRes.data.user;
  if (studentUser.role !== 'user') throw new Error('Student role mismatch');
  console.log('✅ Student login succeeded. Role:', studentUser.role);

  // 2. Prevent role escalation in registration
  console.log('\n[2] Testing Registration Role Escalation Defense...');
  const fakeEmail = `student_${Date.now()}@college.com`;
  const regRes = await req('/auth/register', {
    method: 'POST',
    body: {
      name: 'Test Student',
      email: fakeEmail,
      password: 'StudentPassword123!',
      role: 'admin' // Attempting privilege escalation
    }
  });
  if (!regRes.ok) throw new Error('Registration failed: ' + JSON.stringify(regRes.data));
  if (regRes.data.user.role === 'admin') {
    throw new Error('SECURITY VULNERABILITY: Public registration allowed role=admin!');
  }
  user2Token = regRes.data.token;
  console.log('✅ Privilege escalation thwarted. Registered user forced to role:', regRes.data.user.role);

  // 3. Admin Middleware Authorization check
  console.log('\n[3] Testing Admin Authorization Barrier...');
  const studentBlockedRes = await req('/admin/stats', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  if (studentBlockedRes.status !== 403) {
    throw new Error(`SECURITY VULNERABILITY: Student got status ${studentBlockedRes.status} on admin route!`);
  }
  console.log('✅ Student rejected from admin route with 403 Forbidden.');

  const adminStatsRes = await req('/admin/stats', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (!adminStatsRes.ok) throw new Error('Admin stats failed: ' + JSON.stringify(adminStatsRes.data));
  console.log('✅ Admin accessed admin stats successfully:', adminStatsRes.data.stats);

  // 4. Reporting requires authentication & stores userId
  console.log('\n[4] Testing Item Reporting & Ownership...');
  const unauthReport = await req('/items', {
    method: 'POST',
    body: { title: 'Unauthorized Item', description: 'Should fail', type: 'lost', category: 'Electronics', location: 'Library' }
  });
  if (unauthReport.status !== 401) {
    throw new Error(`Expected 401 on unauthenticated report, got: ${unauthReport.status}`);
  }
  console.log('✅ Unauthenticated reporting blocked with 401 Unauthorized.');

  const lostRes = await req('/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      title: 'Lost Blue Dell Laptop Test',
      description: 'Dell XPS 13 with blue skin left in Study Hall desk',
      type: 'lost',
      category: 'Electronics',
      location: 'Study Hall 2nd Floor',
      dateFoundOrLost: new Date().toISOString(),
      contactName: studentUser.name,
      contactEmail: studentUser.email
    }
  });
  if (!lostRes.ok) throw new Error('Lost item create failed: ' + JSON.stringify(lostRes.data));
  const createdLostItem = lostRes.data.data;
  if (createdLostItem.status !== 'open' || !createdLostItem.userId) {
    throw new Error('Item missing open status or userId: ' + JSON.stringify(createdLostItem));
  }
  console.log('✅ Lost item reported with status=open and userId bound.');

  const foundRes = await req('/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      title: 'Found Blue Dell Laptop Test',
      description: 'Found a Dell laptop with stickers in the Study Hall desk',
      type: 'found',
      category: 'Electronics',
      location: 'Study Hall 2nd Floor',
      dateFoundOrLost: new Date().toISOString(),
      contactName: studentUser.name,
      contactEmail: studentUser.email
    }
  });
  if (!foundRes.ok) throw new Error('Found item create failed: ' + JSON.stringify(foundRes.data));
  const createdFoundItem = foundRes.data.data;
  console.log('✅ Found item reported with status=open.');

  // 5. My Reports Endpoint
  console.log('\n[5] Testing /api/items/my endpoint...');
  const myReportsRes = await req('/items/my', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  if (!myReportsRes.ok) throw new Error('My reports failed: ' + JSON.stringify(myReportsRes.data));
  const myIds = myReportsRes.data.data.map(i => i._id);
  if (!myIds.includes(createdLostItem._id) || !myIds.includes(createdFoundItem._id)) {
    throw new Error('My items response missing newly created items');
  }
  console.log(`✅ /api/items/my returned ${myReportsRes.data.count} items strictly belonging to user.`);

  // 6. Lost / Found Cross-Matching Engine
  console.log('\n[6] Testing Lost ↔ Found Matching API...');
  const matchesRes = await req(`/items/${createdFoundItem._id}/matches`);
  const matchesList = matchesRes.data.matches || matchesRes.data.data;
  if (!matchesRes.ok || !Array.isArray(matchesList)) {
    throw new Error('Matches response invalid: ' + JSON.stringify(matchesRes.data));
  }
  console.log(`✅ Potential matches computed: found ${matchesList.length} match candidates.`);
  if (matchesList.length > 0) {
    const topMatch = matchesList[0];
    console.log(`   Top match: "${topMatch.title || topMatch.item?.title}" with score ${topMatch.matchScore}%`);
    console.log(`   Reasons:`, topMatch.matchReasons || topMatch.reasons);
  }

  // 7. Claim Submission & Duplicate Claim Prevention
  console.log('\n[7] Testing Claim Submission & Duplicate Prevention...');
  const claimRes = await req(`/items/${createdFoundItem._id}/claims`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user2Token}` },
    body: {
      claimantName: 'Test Student',
      claimantEmail: fakeEmail,
      proofDetails: 'My laptop stickers and serial number ending in 5542'
    }
  });
  if (!claimRes.ok) throw new Error('Claim submission failed: ' + JSON.stringify(claimRes.data));
  const createdClaimId = claimRes.data.data._id;
  console.log('✅ Claim submitted. Status:', claimRes.data.data.status);

  // Check item transitioned to pending_claim
  const checkItemRes = await req(`/items/${createdFoundItem._id}`);
  if (checkItemRes.data.data.status !== 'pending_claim') {
    throw new Error(`Expected item status pending_claim, got: ${checkItemRes.data.data.status}`);
  }
  console.log('✅ Item status correctly updated to pending_claim.');

  // Duplicate claim prevention
  const dupClaimRes = await req(`/items/${createdFoundItem._id}/claims`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user2Token}` },
    body: {
      claimantName: 'Test Student',
      claimantEmail: fakeEmail,
      proofDetails: 'Duplicate attempt'
    }
  });
  if (dupClaimRes.status !== 400) {
    throw new Error(`Expected 400 for duplicate claim, got: ${dupClaimRes.status}`);
  }
  console.log('✅ Duplicate pending claim prevented with 400 Bad Request.');

  // 7b. Multiple Claimants on Same Item (Allowing legitimate competing claims)
  console.log('\n[7b] Testing Second Legitimate User Claiming Same Item (pending_claim status)...');
  const user3Email = `student3_${Date.now()}@college.com`;
  const reg3Res = await req('/auth/register', {
    method: 'POST',
    body: {
      name: 'Second Claimant',
      email: user3Email,
      password: 'StudentPassword123!',
    }
  });
  if (!reg3Res.ok) throw new Error('User 3 registration failed');
  const user3Token = reg3Res.data.token;

  const claim2Res = await req(`/items/${createdFoundItem._id}/claims`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user3Token}` },
    body: {
      claimantName: 'Second Claimant',
      claimantEmail: user3Email,
      proofDetails: 'I am the true owner, my initials are etched under the laptop base.'
    }
  });
  if (!claim2Res.ok) {
    throw new Error('Second claimant failed to submit claim on pending_claim item: ' + JSON.stringify(claim2Res.data));
  }
  const createdClaim2Id = claim2Res.data.data._id;
  console.log('✅ Second user successfully filed a competing claim on the item in pending_claim status.');

  // Verify item now has 2 claims
  const itemWithClaims = await req(`/items/${createdFoundItem._id}`);
  if (!itemWithClaims.data.claims || itemWithClaims.data.claims.length !== 2) {
    throw new Error('Expected item to have 2 claims, got: ' + itemWithClaims.data.claims?.length);
  }
  console.log(`✅ Item now has ${itemWithClaims.data.claims.length} claims awaiting admin verification.`);

  // 8. Track My Claims
  console.log('\n[8] Testing /api/claims/my tracking...');
  const myClaimsRes = await req('/claims/my', {
    headers: { Authorization: `Bearer ${user2Token}` }
  });
  if (!myClaimsRes.ok || !myClaimsRes.data.data.some(c => c._id === createdClaimId)) {
    throw new Error('User claims tracking missing created claim: ' + JSON.stringify(myClaimsRes.data));
  }
  console.log(`✅ Track My Claims returned ${myClaimsRes.data.count} claims for user.`);

  // 9. Admin Claim Review & Approval Workflow
  console.log('\n[9] Testing Admin Claim Approval Workflow...');
  const approveRes = await req(`/admin/claims/${createdClaimId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const claimObj = approveRes.data.data?.claim || approveRes.data.data;
  if (!approveRes.ok || claimObj?.status !== 'approved') {
    throw new Error('Admin claim approval failed: ' + JSON.stringify(approveRes.data));
  }
  console.log('✅ Admin approved primary claim.');

  // Check competing claim was automatically rejected
  const allClaimsForUser3 = await req('/claims/my', {
    headers: { Authorization: `Bearer ${user3Token}` }
  });
  const user3Claim = allClaimsForUser3.data.data.find(c => c._id === createdClaim2Id);
  if (!user3Claim || user3Claim.status !== 'rejected') {
    throw new Error('Expected competing claim to be rejected, got: ' + user3Claim?.status);
  }
  console.log('✅ Competing claim was automatically marked as rejected upon approval.');

  const itemAfterApproval = await req(`/items/${createdFoundItem._id}`);
  if (itemAfterApproval.data.data.status !== 'claimed') {
    throw new Error(`Expected item status claimed, got: ${itemAfterApproval.data.data.status}`);
  }
  console.log('✅ Item status transitioned to claimed.');

  // 10. Handover Verification OTP & Item Closure Workflow
  console.log('\n[10] Testing Handover Verification OTP & Case Closure...');
  // Fetch claimant's approved claim to get the OTP
  const claimantClaims = await req('/claims/my', {
    headers: { Authorization: `Bearer ${user2Token}` }
  });
  const approvedClaim = claimantClaims.data.data.find(c => c._id === createdClaimId);
  if (!approvedClaim || !approvedClaim.handoverOtp || approvedClaim.handoverOtp.length !== 6) {
    throw new Error('Approved claim missing 6-digit handoverOtp: ' + JSON.stringify(approvedClaim));
  }
  const generatedOtp = approvedClaim.handoverOtp;
  console.log(`✅ Approved claim generated 6-digit Handover OTP: [ ${generatedOtp} ]`);

  // Test invalid OTP rejection
  const invalidOtpRes = await req(`/items/${createdFoundItem._id}/verify-otp`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { otp: '000000' }
  });
  if (invalidOtpRes.status !== 400) {
    throw new Error(`Expected 400 on incorrect OTP, got: ${invalidOtpRes.status}`);
  }
  console.log('✅ Incorrect OTP correctly rejected with 400 Bad Request.');

  // Test unauthorized user attempting OTP verification
  const unauthVerifyRes = await req(`/items/${createdFoundItem._id}/verify-otp`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${user3Token}` },
    body: { otp: generatedOtp }
  });
  if (unauthVerifyRes.status !== 403) {
    throw new Error(`Expected 403 when random user attempts verification, got: ${unauthVerifyRes.status}`);
  }
  console.log('✅ Unauthorized user verification blocked with 403 Forbidden.');

  // Test successful OTP verification by finder
  const verifyRes = await req(`/items/${createdFoundItem._id}/verify-otp`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { otp: generatedOtp }
  });
  if (!verifyRes.ok || verifyRes.data.data?.item?.status !== 'closed') {
    throw new Error('Valid OTP verification failed: ' + JSON.stringify(verifyRes.data));
  }
  console.log('✅ Handover OTP successfully verified! Item status transitioned to closed.');

  // Cleanup test items
  await req(`/admin/items/${createdFoundItem._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await req(`/admin/items/${createdLostItem._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('\n🧹 Test artifacts cleaned up.');

  console.log('\n🎉 ALL SPECIFICATION TESTS PASSED! 🎉\n');
}

runTests().catch((err) => {
  console.error('\n❌ Fatal test error:', err.message);
  process.exit(1);
});
