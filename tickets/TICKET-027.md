# TICKET-027: Stored XSS in Certificate Template System

**Title**: Certificate Template Placeholders Insert User Data Without HTML Escaping
**Type**: Security
**Priority**: Critical
**Description**: The resolvePlaceholders() function in certificateService.js inserts user data (names, addresses, etc.) into HTML certificates without escaping HTML entities. A malicious resident could enter script tags as their name which would be rendered in certificates.
**Steps to Reproduce** (if applicable):
1. Set resident first name to "<script>alert('xss')</script>"
2. Generate a certificate for that resident
3. Observe the script executes when certificate is viewed
**Expected Behavior**: All user data should be HTML-escaped before insertion into certificate templates.
**Actual Behavior**: certificateService.js lines 334-336 use data[token] directly without escaping: return data[token] !== undefined ? data[token] : '[${token}]';
**Suggested Fix / Approach**: Add HTML entity encoding function (esc) and use it in resolvePlaceholders: const esc = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); Then: return data[token] !== undefined ? esc(data[token]) : '[${token}]';
**Affected Files**:
- barangay-information-management-system-copy/server/src/services/certificateService.js (lines 334-336)