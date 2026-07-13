# Implementation Plan: Asset Insurance Auto-Sync

## Overview

Implementation proceeds in dependency order: model schema first, then the service layer, then the controllers that call the service, then the route-level RBAC changes, then the dashboard backend, and finally the two frontend pages. Testing infrastructure is set up last so the implementation code is available to test against.

---

## Tasks

- [ ] 1. Add `Pending Review` to `InsuranceRecord.status` enum
  - [ ] 1.1 Update `InsuranceRecord.status` enum in `models/InsuranceRecord.js`
    - Add `'Pending Review'` to the enum array: `['Active', 'Insured', 'Request Removal', 'Request Addition', 'Request Update', 'Removed', 'Pending Review']`
    - Keep `default: 'Active'` unchanged
    - No other schema changes required — `linkedAssetId` already exists
    - _Requirements: 4.1_

- [ ] 2. Add auto-sync helpers to `reconciliationService.js`
  - [ ] 2.1 Implement `autoCreateInsuranceRecord(asset, userId)` in `services/reconciliationService.js`
    - Create a new `InsuranceRecord` using the canonical field mapping:
      - `asset.subsidiary` → `subsidiary`
      - `asset.insuranceClass` → `classOfInsurance`
      - `asset.description` → `descriptionDetails`
      - `asset.description` → `assetOrInsurableRisk`
      - `asset.serialNumber` → `serialNumber`
      - `asset.quantity` → `quantity`
      - `asset.unitPrice` → `unitCost`
      - `asset.sumInsured` → `sumInsured`
    - Set `status: 'Pending Review'`, `createdBy: userId`
    - Explicitly zero/blank insurance-specific fields: `monthlyPremium: 0`, `annualPremium: 0`, `rate: 0`, `policyReference: ''`, `vendor: ''`, `interestNoted: ''`
    - After `InsuranceRecord.create`, call `Asset.findByIdAndUpdate` to set `linkedInsuranceRecordId` on the asset
    - Set `InsuranceRecord.linkedAssetId` to the asset's `_id` and `linkedAt: new Date()`
    - Export the function from the module
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 2.2 Implement `mirrorFieldsToInsuranceRecord(assetId, updatedFields)` in `services/reconciliationService.js`
    - Fetch the asset by `assetId` to get its `linkedInsuranceRecordId`; return early (no-op) if none exists
    - Build an update payload from an explicit allowlist of mirrored fields only:
      - `subsidiary`, `classOfInsurance` (from `insuranceClass`), `descriptionDetails` (from `description`), `assetOrInsurableRisk` (from `description`), `serialNumber`, `quantity`, `unitCost` (from `unitPrice`), `sumInsured`
    - Only include a field in the payload if it is present in `updatedFields`
    - Do NOT include `status`, `monthlyPremium`, `annualPremium`, `rate`, `policyReference`, `vendor`, or `interestNoted` in the update payload under any circumstance
    - Use `InsuranceRecord.findByIdAndUpdate` with `{ new: true }`
    - Export the function from the module
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ]* 2.3 Write property test for `autoCreateInsuranceRecord` — Property 1 (field mapping invariant)
    - **Property 1: Auto-creation field mapping invariant**
    - Install `jest`, `fast-check`, and `mongodb-memory-server` as dev dependencies in `backend/`; add a `test` script (`jest`) to `package.json`; create `jest.config.js` (CommonJS, `testEnvironment: 'node'`)
    - Create `tests/reconciliationService.property.test.js`
    - Use `fc.record({ subsidiary: fc.string(), insuranceClass: fc.constantFrom(...enum values), description: fc.string({ minLength: 1 }), serialNumber: fc.string(), quantity: fc.integer({ min: 1, max: 1000 }), unitPrice: fc.float({ min: 0, max: 1_000_000 }) })` as the generator
    - Assert `subsidiary`, `classOfInsurance`, `descriptionDetails`, `assetOrInsurableRisk`, `serialNumber`, `quantity`, `unitCost`, `sumInsured` match the mapping; `status === 'Pending Review'`; `monthlyPremium === 0`, `annualPremium === 0`, `rate === 0`, `policyReference === ''`, `vendor === ''`, `interestNoted === ''`
    - Tag: `// Feature: asset-insurance-auto-sync, Property 1: Auto-creation field mapping invariant`
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.6**

  - [ ]* 2.4 Write property test for `autoCreateInsuranceRecord` — Property 2 (bidirectional link symmetry)
    - **Property 2: Bidirectional link symmetry**
    - Reuse generator from 2.3
    - After calling `autoCreateInsuranceRecord`, fetch the asset and the created InsuranceRecord from the in-memory DB
    - Assert `asset.linkedInsuranceRecordId.toString() === ir._id.toString()` AND `ir.linkedAssetId.toString() === asset._id.toString()`
    - Tag: `// Feature: asset-insurance-auto-sync, Property 2: Bidirectional link symmetry`
    - **Validates: Requirements 1.5, 3.1**

  - [ ]* 2.5 Write property test for `mirrorFieldsToInsuranceRecord` — Property 3 (mirror update preserves insurance-specific fields)
    - **Property 3: Mirror update — mirrored fields propagate, insurance-specific fields preserved**
    - Generator: a linked asset + random delta for mirrored fields + arbitrary pre-set values for insurance-specific fields (`monthlyPremium`, `annualPremium`, `rate`, `policyReference`, `vendor`, `interestNoted`)
    - Call `mirrorFieldsToInsuranceRecord` with the delta; re-fetch the InsuranceRecord
    - Assert mirrored fields reflect the delta; insurance-specific values remain equal to their pre-update values
    - Tag: `// Feature: asset-insurance-auto-sync, Property 3: Mirror update — mirrored fields propagate, insurance-specific fields preserved`
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 2.6 Write property test for `mirrorFieldsToInsuranceRecord` — Property 4 (sum insured computation round-trip)
    - **Property 4: Sum insured computation round-trip**
    - Generator: `fc.integer({ min: 1, max: 10_000 })` for quantity, `fc.float({ min: 0, max: 1_000_000 })` for unitPrice
    - After updating the asset, call `mirrorFieldsToInsuranceRecord`; assert `asset.sumInsured === q * p` and `ir.sumInsured === q * p`
    - Tag: `// Feature: asset-insurance-auto-sync, Property 4: Sum insured computation round-trip`
    - **Validates: Requirements 2.3**

  - [ ]* 2.7 Write property test for `mirrorFieldsToInsuranceRecord` — Property 5 (Pending Review status preserved during mirror)
    - **Property 5: Pending Review status preserved during field mirroring**
    - Create a linked asset whose InsuranceRecord has `status: 'Pending Review'`; generate a random delta for mirrored fields
    - Call `mirrorFieldsToInsuranceRecord`; assert `ir.status === 'Pending Review'` after the update
    - Tag: `// Feature: asset-insurance-auto-sync, Property 5: Pending Review status preserved during field mirroring`
    - **Validates: Requirements 2.4**

- [ ] 3. Update `AssetController.createAsset` — replace `autoLinkAsset` with `autoCreateInsuranceRecord`
  - [ ] 3.1 Modify `controllers/AssetController.js` — `createAsset` handler
    - Import `autoCreateInsuranceRecord` and `mirrorFieldsToInsuranceRecord` from `reconciliationService` (alongside the existing imports)
    - Remove the `autoLinkAsset` fire-and-forget call after `Asset.create`
    - Add a fire-and-forget call in its place:
      ```js
      autoCreateInsuranceRecord(asset, req.user._id).catch((e) =>
        logger.warn(`Auto-sync failed for Asset ${asset.assetId}: ${e.message}`)
      );
      ```
    - Do not change the `201` response or any other logic
    - _Requirements: 1.1, 1.7_

- [ ] 4. Update `AssetController.updateAsset` — add field-mirror fire-and-forget
  - [ ] 4.1 Modify `controllers/AssetController.js` — `updateAsset` handler
    - After the asset is saved (after `Asset.findByIdAndUpdate`), add a conditional fire-and-forget:
      ```js
      if (asset.linkedInsuranceRecordId) {
        mirrorFieldsToInsuranceRecord(asset._id, req.body).catch((e) =>
          logger.warn(`Field mirror failed for Asset ${asset.assetId}: ${e.message}`)
        );
      }
      ```
    - Do not change the existing `propagateAssetStatusToInsurance` or `unlinkAsset` logic
    - Do not change the `200` response
    - _Requirements: 2.1, 2.2, 2.5_

- [ ] 5. Checkpoint — verify service and controller wiring
  - Ensure all tests written so far pass, ask the user if questions arise.

- [ ] 6. Update `insuranceRoutes.js` — restrict `POST /` and `PUT /:id` to admin only
  - [ ] 6.1 Modify `routes/insuranceRoutes.js`
    - Change `router.post('/', protect, authorize('admin', 'campus_manager'), ...)` to `router.post('/', protect, authorize('admin'), ...)`
    - Change `router.put('/:id', protect, authorize('admin', 'campus_manager'), ...)` to `router.put('/:id', protect, authorize('admin'), ...)`
    - Leave `DELETE /:id` (`authorize('admin')`), `GET /`, `GET /template`, and `POST /bulk` unchanged
    - _Requirements: 6.2, 6.5_

  - [ ]* 6.2 Write property test — Property 10 (non-admin mutation requests receive 403)
    - **Property 10: Non-admin mutation requests receive 403**
    - Create `tests/insuranceRoutes.property.test.js`; set up an Express test app with the insurance router mounted, using `mongodb-memory-server` for isolation
    - Generator: `fc.constantFrom('campus_manager', 'viewer')` for role, plus `fc.object()` for request body
    - Assert that `POST /api/insurance-register`, `PUT /api/insurance-register/:id`, and `DELETE /api/insurance-register/:id` all return `403` for campus_manager and viewer tokens
    - Tag: `// Feature: asset-insurance-auto-sync, Property 10: Non-admin mutation requests receive 403`
    - **Validates: Requirements 6.2, 6.5**

  - [ ]* 6.3 Write property test — Property 9 (campus manager GET returns only own-campus records)
    - **Property 9: Campus manager GET returns only own-campus records**
    - Generator: random campus name string for the user's campus; random array (length 2–10) of InsuranceRecord stubs spread across at least 2 different campus values
    - Seed the in-memory DB; send `GET /api/insurance-register` with a campus_manager token for the user's campus
    - Assert every record in the response has `subsidiary === userCampus`
    - Tag: `// Feature: asset-insurance-auto-sync, Property 9: Campus manager GET returns only own-campus records`
    - **Validates: Requirements 6.1**

- [ ] 7. Update `assetRoutes.js` — restrict `POST /bulk` to admin only
  - [ ] 7.1 Modify `routes/assetRoutes.js`
    - Change `router.post('/bulk', protect, authorize('admin', 'campus_manager'), ...)` to `router.post('/bulk', protect, authorize('admin'), ...)`
    - Leave all other routes unchanged
    - _Requirements: 7.3_

  - [ ]* 7.2 Write property test — Property 13 (bulk import does not trigger auto-sync)
    - **Property 13: Bulk import does not trigger auto-sync**
    - Generator: `fc.array(fc.record({ subsidiary: fc.string(), insuranceClass: fc.string(), description: fc.string({ minLength: 1 }), unitPrice: fc.float({ min: 1 }) }), { minLength: 1, maxLength: 100 })` for asset rows
    - Call the `bulkImport` controller directly (or via test HTTP call) with admin credentials; afterward count `InsuranceRecord` documents and assert the count is `0`; assert every created asset has `linkedInsuranceRecordId === null`
    - Tag: `// Feature: asset-insurance-auto-sync, Property 13: Bulk import does not trigger auto-sync`
    - **Validates: Requirements 7.1, 7.2**

- [ ] 8. Update `DashboardController.getDashboardAnalytics` — add `pendingReviewCount`
  - [ ] 8.1 Modify `controllers/DashboardController.js`
    - Add a `pendingReviewCount` query to the existing `Promise.all` fan-out:
      ```js
      InsuranceRecord.countDocuments({ ...campusFilter, status: 'Pending Review' })
      ```
    - Destructure the result as `pendingReviewCount` from `Promise.all`
    - Include `pendingReviewCount` in the `res.status(200).json(...)` response object alongside the existing fields
    - _Requirements: 5.1, 5.4_

  - [ ]* 8.2 Write property test — Property 8 (dashboard `pendingReviewCount` is correct and role-scoped)
    - **Property 8: Dashboard pendingReviewCount is correct and role-scoped**
    - Create `tests/dashboardController.property.test.js`
    - Generator: random array of InsuranceRecord stubs with `fc.constantFrom(...allStatuses)` for `status` and random campus for `subsidiary`; random user role from `['admin', 'campus_manager']`
    - Seed the in-memory DB; call `getDashboardAnalytics` via test HTTP; compare returned `pendingReviewCount` to the actual count queried directly
    - For admin: assert count equals total `Pending Review` records across all campuses
    - For campus_manager assigned to campus C: assert count equals `Pending Review` records where `subsidiary === C`
    - Tag: `// Feature: asset-insurance-auto-sync, Property 8: Dashboard pendingReviewCount is correct and role-scoped`
    - **Validates: Requirements 5.1, 5.4, 5.5**

- [ ] 9. Checkpoint — backend complete, run all tests
  - Ensure all backend tests pass, ask the user if questions arise.

- [ ] 10. Update `InsuranceRegister.jsx` — RBAC gating, `Pending Review` status, and status filter
  - [ ] 10.1 Gate destructive controls on `isAdmin` in `InsuranceRegister.jsx`
    - Import `useAuth` from `@/context/AuthContext`; destructure `isAdmin` from the hook at the top of the component
    - Wrap the "Add Record" `<Button onClick={openCreate}>` in `{isAdmin && ...}` so it is only rendered for admin users
    - Wrap the per-row Edit `<button onClick={() => openEdit(r)}>` and Delete `<button onClick={() => handleDelete(r._id)}>` cells in `{isAdmin && ...}`
    - Wrap the entire Bulk Import `<TabsTrigger value="bulk">` and corresponding `<TabsContent value="bulk">` in `{isAdmin && ...}` so campus_managers cannot see the bulk upload tab
    - _Requirements: 6.3, 6.4_

  - [ ] 10.2 Add `'Pending Review'` to statuses array and `statusColour` map in `InsuranceRegister.jsx`
    - Add `'Pending Review'` to the `statuses` array used in the status dropdown
    - Add the amber entry to `statusColour`:
      ```js
      'Pending Review': 'bg-amber-100 text-amber-700',
      ```
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ] 10.3 Add a status filter dropdown to the Insurance Register table in `InsuranceRegister.jsx`
    - Add a `statusFilter` state variable initialised to `'all'`
    - Read the `?status` query parameter from `useSearchParams()` (or `useLocation`) on mount and initialise `statusFilter` from it; this supports navigation from the Dashboard Pending Review badge
    - Render a `<Select>` above the records table with options: `All Statuses`, then each entry from `statuses`
    - Filter the displayed `records` array: `records.filter(r => statusFilter === 'all' || r.status === statusFilter)`
    - _Requirements: 5.3, 4.2_

  - [ ]* 10.4 Write property test — Property 11 (InsuranceRegister renders read-only for campus_manager)
    - **Property 11: InsuranceRegister renders read-only for campus_manager**
    - Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `fast-check` as dev dependencies in the frontend; add a `test` script (`vitest --run`) to `package.json`; create `vitest.config.js`
    - Create `src/pages/__tests__/InsuranceRegister.property.test.jsx`
    - Generator: `fc.constantFrom('campus_manager', 'viewer')` for role; mock `useAuth` to return `{ isAdmin: false, user: { role } }`; mock all API calls to return an empty records list
    - Render `<InsuranceRegister />` inside a test wrapper; assert that no element with text matching `/Add Record/i` is present in the DOM, and that no Edit or Delete buttons are rendered
    - Tag: `// Feature: asset-insurance-auto-sync, Property 11: InsuranceRegister renders read-only for campus_manager`
    - **Validates: Requirements 6.3**

  - [ ]* 10.5 Write property test — Property 12 (amber badge for Pending Review records)
    - **Property 12: Pending Review status badge uses amber colour**
    - Generator: an array of 1–20 InsuranceRecord stubs where each record has `fc.constantFrom(...allStatuses)` for status; mock API to return these records; mock `useAuth` to return admin
    - Render the Insurance Register; for every record with `status === 'Pending Review'`, find its status badge element and assert that its `className` contains `amber`
    - Tag: `// Feature: asset-insurance-auto-sync, Property 12: Pending Review status badge uses amber colour`
    - **Validates: Requirements 4.2**

- [ ] 11. Update `Dashboard.jsx` — add amber Pending Review KPI card for admin
  - [ ] 11.1 Add `pendingReviewCount` card to `Dashboard.jsx`
    - Import `useAuth` from `@/context/AuthContext`; destructure `isAdmin` at the top of the `Dashboard` component
    - Extract `pendingReviewCount` from the analytics data object: `safe(data?.pendingReviewCount)` (consistent with existing `safe()` helper)
    - Import `Clock` (or `AlertCircle`) from `lucide-react` for the card icon
    - Add a fifth `StatCard` entry to the `stats` array (or render it separately after the existing four), conditionally shown only when `isAdmin`:
      ```jsx
      {isAdmin && (
        <button
          onClick={() => navigate('/insurance-register?status=Pending+Review')}
          className="text-left w-full"
        >
          <StatCard
            label="Pending Review"
            value={fmt(pendingReviewCount)}
            sub="Auto-created records awaiting admin completion"
            changeLabel={pendingReviewCount > 0 ? 'Needs attention' : 'All clear'}
            trend={pendingReviewCount > 0 ? 'down' : 'up'}
            icon={Clock}
            accent="bg-amber-500"
          />
        </button>
      )}
      ```
    - Import `useNavigate` from `react-router-dom`; call `const navigate = useNavigate()` inside the component
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ]* 11.2 Write property test — Property 8 frontend slice (admin sees badge, non-admin does not)
    - **Property 8 frontend: Dashboard Pending Review badge is shown to admin only**
    - Create `src/pages/__tests__/Dashboard.property.test.jsx`
    - Generator: `fc.integer({ min: 0, max: 500 })` for `pendingReviewCount`; `fc.constantFrom('admin', 'campus_manager', 'viewer')` for role
    - Mock `fetchDashboardAnalytics` to resolve with `{ pendingReviewCount, ...otherFields }`; mock `useAuth` based on role
    - Render `<Dashboard />`; when role is `'admin'`, assert an element with text `'Pending Review'` is in the DOM; when role is not `'admin'`, assert no such element
    - Tag: `// Feature: asset-insurance-auto-sync, Property 8 frontend: Dashboard Pending Review badge is shown to admin only`
    - **Validates: Requirements 5.1, 5.5**

- [ ] 12. Write remaining backend property-based tests
  - [ ]* 12.1 Write property test — Property 6 (asset deletion preserves InsuranceRecord, clears back-reference)
    - **Property 6: Asset deletion preserves InsuranceRecord, clears back-reference**
    - Create test in `tests/reconciliationService.property.test.js` (or a new `assetController.property.test.js`)
    - Generator: a linked asset + InsuranceRecord pair created in the in-memory DB
    - Call `onAssetDeleted(asset)` then `asset.deleteOne()`; re-fetch the InsuranceRecord by `_id`
    - Assert the InsuranceRecord still exists (not `null`) AND `ir.linkedAssetId === null`
    - Tag: `// Feature: asset-insurance-auto-sync, Property 6: Asset deletion preserves InsuranceRecord, clears back-reference`
    - **Validates: Requirements 3.2**

  - [ ]* 12.2 Write property test — Property 7 (InsuranceRecord deletion clears Asset link and sets Not Insured)
    - **Property 7: Insurance Record deletion clears Asset link and sets Not Insured**
    - Generator: a linked InsuranceRecord + Asset pair created in the in-memory DB
    - Call `onInsuranceRecordDeleted(rec)` then `rec.deleteOne()`; re-fetch the Asset by `_id`
    - Assert `asset.linkedInsuranceRecordId === null` AND `asset.insuranceStatus === 'Not Insured'`
    - Tag: `// Feature: asset-insurance-auto-sync, Property 7: Insurance Record deletion clears Asset link and sets Not Insured`
    - **Validates: Requirements 3.3**

- [ ] 13. Write unit tests for example-based scenarios
  - [ ]* 13.1 Write unit tests for `autoCreateInsuranceRecord` and `mirrorFieldsToInsuranceRecord` in `tests/reconciliationService.unit.test.js`
    - Auto-creation failure does not fail asset creation: mock `InsuranceRecord.create` to throw; assert `createAsset` still returns `201` and the fire-and-forget error is logged
    - Mirror failure does not fail asset update: mock `InsuranceRecord.findByIdAndUpdate` to throw inside `mirrorFieldsToInsuranceRecord`; assert `updateAsset` still returns `200`
    - Auto-creation skipped on bulk import: call the `bulkImport` controller directly; spy on `InsuranceRecord.create`; assert it was never called (or called zero times for the auto-sync path)
    - Admin can change status away from Pending Review: create an InsuranceRecord with `status: 'Pending Review'`; send `PUT` with `{ status: 'Active' }`; assert the saved record has `status === 'Active'`
    - Manual link clear on asset clears InsuranceRecord back-reference: update asset with `linkedInsuranceRecordId: null`; assert `InsuranceRecord.linkedAssetId` is `null`
    - _Requirements: 1.7, 2.5, 4.3, 7.1_

  - [ ]* 13.2 Write unit tests for RBAC and link uniqueness in `tests/insuranceRoutes.unit.test.js`
    - Two assets cannot link to the same InsuranceRecord: attempt to call `linkAssetToInsuranceRecord` for a second asset to an already-linked InsuranceRecord; assert the second link is rejected / the first link is preserved
    - Two InsuranceRecords cannot link to the same Asset: attempt to link a second InsuranceRecord to an already-linked asset; assert the second attempt does not overwrite the first
    - _Requirements: 3.5, 3.6_

  - [ ]* 13.3 Write unit tests for `Dashboard.jsx` in `src/pages/__tests__/Dashboard.unit.test.jsx`
    - Admin sees all Insurance Register controls: render `InsuranceRegister` with admin auth context; assert Add Record button, Edit buttons, and Delete buttons are present in the DOM
    - Clicking Pending Review badge navigates to filtered Insurance Register: simulate a click on the Pending Review card in Dashboard; assert `navigate` was called with `/insurance-register?status=Pending+Review`
    - _Requirements: 5.3, 6.4_

- [ ] 14. Final checkpoint — ensure all tests pass
  - Run `npm test` in `backend/` and `npm run test` (or `vitest --run`) in the frontend project
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery — the feature is complete without them, but they provide property-based and unit-test coverage for all 13 correctness properties in the design.
- The backend test stack (`jest`, `fast-check`, `mongodb-memory-server`) must be installed before any backend test tasks can run. Task 2.3 sets up the test infrastructure; subsequent backend test tasks inherit it.
- The frontend test stack (`vitest`, `@testing-library/react`, `fast-check`) must be installed before any frontend test tasks can run. Task 10.4 sets up the frontend test infrastructure.
- Backend tests run against an in-memory MongoDB instance — they are safe to run in CI without a live database.
- The `autoLinkAsset` function in `reconciliationService.js` is retained for use by `InsuranceController.createRecord` (existing insurance-side auto-link logic) — only the call in `AssetController.createAsset` is replaced.
- The `isAdmin` boolean is already exported by `useAuth()` in `AuthContext.jsx` — no changes to the auth context are needed.
- `pendingReviewCount` is added to the existing `Promise.all` in `DashboardController`; if the query fails, the dashboard `500` handler already covers it gracefully.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "2.6", "2.7", "3.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["6.1", "7.1", "8.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.2", "8.2"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3", "11.1"] },
    { "id": 7, "tasks": ["10.4", "10.5", "11.2", "12.1", "12.2"] },
    { "id": 8, "tasks": ["13.1", "13.2", "13.3"] }
  ]
}
```
