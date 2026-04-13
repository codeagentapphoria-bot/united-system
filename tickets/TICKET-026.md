# TICKET-026: ~66 Files Using index as Key in .map() Calls

**Title**: Using index Variable as Key Causes Incorrect React Component Updates
**Type**: Bug
**Priority**: High
**Description**: ~66 files use key={index}, key={i}, or key={idx} in .map() calls. React uses keys to track which items changed, added, or removed. Using index as key causes React to reuse DOM elements incorrectly, leading to stale data displays and incorrect updates when lists are reordered or modified.
**Steps to Reproduce** (if applicable):
1. Render a list with items that can be reordered or updated
2. Change the order or update an item
3. Observe incorrect rendering or stale data
**Expected Behavior**: Use stable unique identifiers (e.g., key={item.id}) that persist across data changes.
**Actual Behavior**: Multiple files use key={index}, key={i}, or key={idx} in .map() calls.
**Suggested Fix / Approach**: Replace all index-based keys with key={item.id} or similar stable identifier. For generated items without IDs, generate a unique key using crypto.randomUUID() or similar.
**Affected Files**:
- borongan-eService-system-copy/multysis-frontend/src/components/services/ServiceTabs.tsx (multiple instances - lines 69, 91, 112, 141, 156)
- borongan-eService-system-copy/multysis-frontend/src/components/social-amelioration/SeniorCitizenTab.tsx (key={idx} at lines 137, 159)
- ~64 more files with similar issues
