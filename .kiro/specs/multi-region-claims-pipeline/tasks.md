# Implementation Plan: Multi-Region & Claims Pipeline

## Overview

Implementation proceeds in dependency order: data models first, then services, then controllers, then routes, then frontend. Each wave can be executed in parallel within the wave.

---

## Tasks

- [ ] 1. Update User model — super_admin role + region enum + unreadNotifications
  - [ ] 1.1 Modify `models/User.js`
    - Add `'super_admin'` to `role` enum: `['super_admin', 'admin', 'campus_manager', 'viewer']`
    - Change `region` from free-text String to enum: `['South Africa', 'Kenya']`, default `'South Africa'`
    - Add `unreadNotifications: { type: Number, default: 0 }`
    - _Requirements: 1.1, 1.5_

- [ ] 2. Update Campus model — region enum + Kenya campus seeding
  - [ ] 2.1 Modify `models/Campus.js`
    - Change `region` field to enum `['South Africa', 'Kenya']`, default `'South Africa'`
    - _Requirements: 2.1_
  - [ ] 2.2 Extend `index.js` campus seeding block
    - Add the 10 Kenya campuses (Network, Tatu Boys, Tatu Girls, Tatu Primary, Athi Primary, Eldoret Boys, Eldoret Girls, Tatu Shared, Tatu International, Eldoret Primary) with `region: 'Kenya'` using upsert-by-name so it is idempotent
    - Update existing 5 SA campuses to set `region: 'South Africa'` if not already set
    - _Requirements: 2.2, 2.3_

- [ ] 3. Update InsuranceRecord model — Kenya-specific fields
  - [ ] 3.1 Modify `models/InsuranceRecord.js`
    - Add 15 Kenya-specific optional fields as specified in the design:
      `physical_location`, `procuring_department`, `year_of_purchase`, `years_of_service`, `age_bracket`, `asset_class`, `insurance_priority`, `insurable_value`, `retire_write_off_date`, `quantity_retired` (default 0), `retired_asset_value` (default 0), `asset_usage_status`, `document_link`, `pr_ref`, `ownership`
    - All new fields optional with empty string or 0 defaults — no breaking change to SA records
    - _Requirements: 13.1, 13.2_

- [ ] 4. Update Claim model — new status enum + extended fields + data migration
  - [ ] 4.1 Modify `models/Claim.js`
    - Replace `claimStatus` enum with: `['Internal WIP', 'Lodged', 'Paid Out', 'Rejected', 'Withdrawn', 'Below Minimum Excess']`, default `'Internal WIP'`
    - Add new fields: `linked_incident_id`, `insurer_notified_date`, `internal_report_date`, `excess_paid` (default 0), `claim_amount_paid` (default 0), `other_replacement`, `np_user`, `item_pending`, `region` (enum SA/KE, default SA)
    - _Requirements: 9.1, 10.1_
  - [ ] 4.2 Add one-time migration to `index.js` startup block
    - Run `Claim.updateMany({ claimStatus: 'Pending' }, { $set: { claimStatus: 'Internal WIP' } })` after MongoDB connects — idempotent
    - _Requirements: 9.2_

- [ ] 5. Create IncidentNotification model
  - [ ] 5.1 Create `models/IncidentNotification.js`
    - All fields as per design: reporter_name, reporter_email, user_id, campus_id, duty_station_detail, incident_date_time, timing_type, report_timestamp, incident_ref, description, incident_type, status, is_converted_to_claim, linked_claim_id, evidence_files, createdBy, updatedBy
    - Add `pre('save')` hook to auto-generate `incident_ref` in format `INC-YYYY-NNN`
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6. Create RegionService
  - [ ] 6.1 Create `services/regionService.js`
    - Implement `getCampusNamesByRegion(region)` — returns array of campus name strings
    - Implement `getCampusRegion(campusName)` — returns region string, defaults to 'South Africa' if not found
    - Implement `getRegionFilter(user)` — returns MongoDB filter object scoped to user's role/region/campus
    - Export all three functions
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 7. Add keAutoSync to reconciliationService
  - [ ] 7.1 Add `keAutoSync(asset, userId)` to `services/reconciliationService.js`
    - Creates InsuranceRecord with `status: 'Insured'` (NOT 'Pending Review'), maps all fields from asset
    - Sets `Asset.linkedInsuranceRecordId` and `Asset.insuranceStatus = 'Insured'`
    - Sets `InsuranceRecord.linkedAssetId` and `linkedAt`
    - Leaves `document_link` empty
    - Export from module
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Update auth middleware — super_admin support
  - [ ] 8.1 Modify `middleware/auth.js`
    - Update `protect` middleware to allow `super_admin` role through all `authorize()` checks that currently allow `admin` — super_admin should be treated as having all permissions
    - Add `authorize('super_admin', 'admin', ...)` pattern or update authorize to implicitly include super_admin
    - _Requirements: 1.6, 3.4_

- [ ] 9. Update AssetController — region-aware auto-sync routing
  - [ ] 9.1 Modify `controllers/AssetController.js` — `createAsset` handler
    - Import `getCampusRegion` from regionService and `keAutoSync` from reconciliationService
    - After `Asset.create`, call `getCampusRegion(asset.subsidiary)` then fire-and-forget route: Kenya → `keAutoSync()`, South Africa → existing `autoCreateInsuranceRecord()`
    - Remove the direct `autoCreateInsuranceRecord` call that currently fires unconditionally
    - _Requirements: 6.1, 6.6, 6.7_

- [ ] 10. Update InsuranceController — region scoping + Kenya document_link validation
  - [ ] 10.1 Modify `controllers/InsuranceController.js` — `getRecords`
    - Replace hardcoded campus_manager filter with `getRegionFilter(req.user)` from regionService
    - _Requirements: 3.1, 3.2_
  - [ ] 10.2 Modify `controllers/InsuranceController.js` — `createRecord`
    - After parsing subsidiary, call `getCampusRegion(subsidiary)` and return HTTP 422 if region is Kenya and `document_link` is absent or empty
    - Accept and save all new KE-specific fields from req.body
    - _Requirements: 5.1, 5.3_
  - [ ] 10.3 Modify `controllers/InsuranceController.js` — `updateRecord`
    - Apply same Kenya document_link validation
    - Accept updates for all new KE-specific fields
    - _Requirements: 5.1, 5.3_

- [ ] 11. Update ClaimController — new statuses + extended fields + region scoping
  - [ ] 11.1 Modify `controllers/ClaimController.js` — `getClaims`
    - Apply `getRegionFilter(req.user)` to scope queries by region
    - _Requirements: 3.1, 3.2_
  - [ ] 11.2 Modify `controllers/ClaimController.js` — `createClaim`
    - Accept all new extended fields: `excess_paid`, `claim_amount_paid`, `np_user`, `item_pending`, `insurer_notified_date`, `internal_report_date`, `other_replacement`, `region`, `linked_incident_id`
    - Validate `excess_paid` and `claim_amount_paid` ≥ 0
    - _Requirements: 10.1, 10.3_
  - [ ] 11.3 Modify `controllers/ClaimController.js` — `updateClaim`
    - Accept updates for all new extended fields
    - _Requirements: 10.1_

- [ ] 12. Update DashboardController — region-aware + live aggregations only
  - [ ] 12.1 Modify `controllers/DashboardController.js`
    - Import `getRegionFilter` from regionService; replace the existing `campusFilter` logic with `await getRegionFilter(req.user)`
    - Remove hardcoded `replacementValueChange: 5.0` and `sumInsuredChange: 2.3`; set both to `null`
    - Add to `Promise.all`: `openIncidentsCount` (from IncidentNotification, scoped by region), `claimsByStatus` (aggregation replacing existing claimsAgg shape)
    - Add KE-only aggregations: `matchedByDesignCount` (assets created this month), `keAssetCount`, `keInsuredCount`
    - Conditionally include `pendingReviewCount` (SA only), `keUnifiedTotals` (KE only), `matchedByDesignCount` (KE only) in response
    - Import IncidentNotification model
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 12.1, 12.2, 12.3, 12.4, 12.8_

- [ ] 13. Create IncidentController
  - [ ] 13.1 Create `controllers/IncidentController.js`
    - Implement `getIncidents` — filtered by `getRegionFilter(req.user)` via campus_id lookup; support query params for status, campus, incident_type, date range
    - Implement `createIncident` — save IncidentNotification; fire-and-forget: if campus region is Kenya, increment `unreadNotifications` on all KE admins
    - Implement `updateIncident` — update status and other fields
    - Implement `deleteIncident` — return HTTP 409 if `is_converted_to_claim = true`
    - Implement `convertToClaim` — create Claim with `claimStatus: 'Internal WIP'`, set bidirectional links, return HTTP 409 if already converted
    - Implement `getIncidentById` — populate campus_id and linked_claim_id
    - _Requirements: 7.7, 7.8, 7.10, 7.11, 7.12, 8.1, 8.4, 8.5, 8.7, 16.1, 16.3_

- [ ] 14. Create incidentRoutes + update userRoutes + register in index.js
  - [ ] 14.1 Create `routes/incidentRoutes.js`
    - `GET /` — protect, getIncidents
    - `GET /:id` — protect, getIncidentById
    - `POST /` — protect, authorize('admin', 'super_admin', 'campus_manager'), multer evidence upload, createIncident
    - `PUT /:id` — protect, authorize('admin', 'super_admin', 'campus_manager'), updateIncident
    - `POST /:id/convert` — protect, authorize('admin', 'super_admin', 'campus_manager'), convertToClaim
    - `DELETE /:id` — protect, authorize('admin', 'super_admin'), deleteIncident
    - _Requirements: 7.9, 8.6_
  - [ ] 14.2 Add bell mark-read route to `routes/userRoutes.js`
    - `PUT /notifications/read` — protect, markNotificationsRead handler (sets `unreadNotifications: 0`)
    - Place before `/:id` wildcard
  - [ ] 14.3 Register incident routes in `index.js`
    - `app.use('/api/incidents', incidentRoutes)`

- [ ] 15. Update AuthContext — region + currency + super_admin helpers
  - [ ] 15.1 Modify `src/context/AuthContext.jsx`
    - Add computed values: `region`, `isSuperAdmin`, `currencySymbol` (`'KSh'` if Kenya else `'R'`), `isKenya`, `isSouthAfrica`
    - Export all new values through the context provider
    - Update `isAdmin` helper to also return true for super_admin
    - _Requirements: 4.1, 4.2, 4.4, 1.6_

- [ ] 16. Update Layout — bell badge + Incidents nav item
  - [ ] 16.1 Modify `src/components/Layout.jsx`
    - Import `AlertCircle` from lucide-react; add `{ label: 'Incidents', icon: AlertCircle, href: '/incidents' }` to `navItems`
    - Add `unread` state; initialise from `user?.unreadNotifications` on mount
    - Replace static bell `<button>` with dynamic version: show numeric badge when `unread > 0`, navigate to `/incidents` on click, call `markNotificationsRead()` API, reset `unread` to 0
    - Show admin nav section for both `admin` and `super_admin` roles
    - _Requirements: 7.12_

- [ ] 17. Update Dashboard — region-aware KPIs + currency + new indicator cards
  - [ ] 17.1 Modify `src/pages/Dashboard.jsx`
    - Import `useAuth`; destructure `currencySymbol`, `isKenya`, `isSouthAfrica`, `isAdmin`
    - Replace all hardcoded `'R '` prefixes in stat values with `${currencySymbol} `
    - Remove the `replacementValueChange` and `sumInsuredChange` stat cards (now null from API)
    - Add Open Incidents card (amber, for all admin/campus_manager users) — links to `/incidents`
    - Add SA-only: Pending Review card (already exists — keep as-is)
    - Add KE-only: Unified Register Totals card (green, shows assets = insured, 100%)
    - Add KE-only: Matched by Design card (blue, shows this month's count)
    - Read new API fields: `openIncidentsCount`, `keUnifiedTotals`, `matchedByDesignCount`, `claimsByStatus`
    - _Requirements: 11.4, 12.1, 12.2, 12.3, 12.4, 12.8_

- [ ] 18. Create Incidents page
  - [ ] 18.1 Create `src/pages/Incidents.jsx`
    - Header: title "Incident Notifications", "New Incident" button
    - Stats row: total, New, Under Review, Converted, Dismissed counts
    - Filter bar: status dropdown, campus dropdown, incident_type dropdown
    - Table columns: Ref, Status badge, Campus, Type, Reporter, Date, Description (truncated), Evidence count, Actions (Edit, Convert to Claim, Delete)
    - Create/edit dialog with all required fields: reporter_name, reporter_email, campus_id, timing_type, incident_date_time, incident_type, description, duty_station_detail, evidence file upload
    - "Convert to Claim" button: visible to admin/campus_manager, disabled with tooltip if `is_converted_to_claim = true`
    - Show linked claim badge (incident_ref) when converted, with link to `/claims`
    - Import `fetchIncidents`, `createIncident`, `updateIncident`, `convertToClaim` from api.js
    - _Requirements: 7.7, 7.8, 8.1, 8.5, 8.7_

- [ ] 19. Add Incidents route to App.jsx
  - [ ] 19.1 Modify `src/App.jsx`
    - Import `Incidents` page
    - Add `<Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />`

- [ ] 20. Update Claims page — new statuses + extended fields + incident link
  - [ ] 20.1 Modify `src/pages/Claims.jsx`
    - Update `STATUSES` array to: `['Internal WIP', 'Lodged', 'Paid Out', 'Rejected', 'Withdrawn', 'Below Minimum Excess']`
    - Update `statusColour` map with colours for all 6 statuses
    - Update `blankForm` with new fields: `excess_paid`, `claim_amount_paid`, `np_user`, `item_pending`, `insurer_notified_date`, `internal_report_date`
    - Add new fields to create/edit form
    - Show linked incident badge in table and edit form when `linked_incident_id` is present — displays `incident_ref`, links to `/incidents`
    - Import `useAuth` and use `currencySymbol` for all monetary formatting
    - _Requirements: 9.1, 10.1, 10.2, 4.1, 4.2_

- [ ] 21. Update InsuranceRegister — Kenya fields + mandatory document_link
  - [ ] 21.1 Modify `src/pages/InsuranceRegister.jsx`
    - Import `useAuth`; destructure `isKenya`, `currencySymbol`
    - Add `document_link` field to create/edit form — mark as required (`*`) when `isKenya`
    - Add KE-specific fields section (conditional on `isKenya`): physical_location, procuring_department, year_of_purchase, asset_class, insurance_priority, insurable_value, asset_usage_status, ownership, quantity_retired, retired_asset_value, pr_ref
    - Use `currencySymbol` for all monetary display
    - _Requirements: 5.1, 5.5, 5.6, 5.7, 13.1, 4.1, 4.2_

- [ ] 22. Add incident API functions to api.js
  - [ ] 22.1 Modify `src/services/api.js`
    - Add: `fetchIncidents`, `createIncident`, `updateIncident`, `convertToClaimFromIncident`, `deleteIncident`, `fetchIncidentById`, `markNotificationsRead`
    - _Requirements: 7.7, 8.1_

- [ ] 23. Update UserController — invite/create user with region validation
  - [ ] 23.1 Modify `controllers/UserController.js` — `inviteUser` and `createUser`
    - Validate `region` is one of `['South Africa', 'Kenya']`
    - When an admin (not super_admin) creates a user, enforce that the new user's region matches the admin's region; return HTTP 403 if region mismatch
    - _Requirements: 1.3, 1.4_

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.1", "5.1"] },
    { "id": 1, "tasks": ["2.2", "4.2", "6.1", "7.1", "8.1"] },
    { "id": 2, "tasks": ["9.1", "10.1", "10.2", "10.3", "11.1", "11.2", "11.3", "12.1", "13.1", "23.1"] },
    { "id": 3, "tasks": ["14.1", "14.2", "14.3"] },
    { "id": 4, "tasks": ["15.1"] },
    { "id": 5, "tasks": ["16.1", "17.1", "18.1", "20.1", "21.1", "22.1"] },
    { "id": 6, "tasks": ["19.1"] }
  ]
}
```

---

## Notes

- All backend tasks (waves 0–3) must complete before any frontend tasks (waves 4–6) to avoid type/API mismatches.
- Task 8.1 (auth middleware super_admin) is a prerequisite for all controller updates in wave 2.
- The data migration in 4.2 runs on every server startup but is idempotent — safe to deploy without a manual migration step.
- Kenya campus seeding in 2.2 uses upsert-by-name — will not create duplicates if a campus already exists with a different region value; it only inserts missing campuses.
- The `document_link` field is validated at the controller level (not schema level) to allow SA records to remain unchanged without a required field validator.
