# TICKET-031: Email Enumeration in Forgot Password Endpoint

**Title**: Forgot Password Returns Distinct Error for Non-Existent Email
**Type**: Security
**Priority**: Medium
**Description**: The forgot password endpoint returns a 404 error when the email is not found, allowing attackers to enumerate which emails are registered in the system.
**Steps to Reproduce** (if applicable):
1. Submit forgot password request with non-existent email
2. Observe 404 error: "User not found with this email"
3. Submit with existing email
4. Observe different behavior (email sent or 200 response)
**Expected Behavior**: Endpoint should return the same success response regardless of whether email exists (to prevent enumeration).
**Actual Behavior**: auth.js lines 88-93 throw ApiError(404, "User not found with this email") when email not found.
**Suggested Fix / Approach**: Always return a generic success message: "If an account with that email exists, a password reset link has been sent." regardless of whether the email was found. Log the attempted email for monitoring but don't reveal existence to the caller.
**Affected Files**:
- barangay-information-management-system-copy/server/src/services/auth.js (lines 88-93)