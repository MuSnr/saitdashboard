# Requirements Document

## Introduction

SAIT (School Asset and Insurance Tool) currently operates as a single-region system serving Nova Pioneer's South Africa campuses. This feature extends SAIT to support both South Africa (SA) and Kenya (KE) operations under a unified platform, while preserving the existing SA workflows unchanged.

The most significant architectural change for Kenya is the **Unified Register** model: for Kenya, the Asset Register and the Insurance Register are the same entity. Every asset created in a Kenya campus is simultaneously an insured item — there is no reconciliation gap, no scoring engine, and no Pending Review status. Coverage variance is 0.00 by design.

The scope covers seven interconnected areas:

1. Regional profiles — role-scoped data visibility and currency display per region
2. Kenya Unified Register — invoice/document link as mandatory field on Kenya Insurance Records
3. Kenya 1:1 auto-sync — guaranteed direct link on asset creation, bypassing the scoring engine
4. Incident Notification — a new intake entity that replaces the Google Form process
5. Claims pipeline — a formalised six-step workflow on the existing Claims module
6. Dashboard updates — region-aware KPIs, live aggregations, and new operational indicators
7. Kenya Insurance Register — definitive field set from the Kenya Final_Count spreadsheet

---

## Glossary

- **System**: The SAIT backend API and frontend application collectively
- **Region**: One of the two supported operational territories — `'South Africa'` or `'Kenya'`
- **super_admin**: A user with unrestricted cross-region visibility; the highest privilege level
- **admin**: A user scoped to one Region; can manage all campuses and data within that Region
- **campus_manager**: A user scoped to a single Campus; can manage data for that Campus only
- **viewer**: A read-only user scoped to one Region
- **Campus**: An organisational unit belonging to exactly one Region
- **Asset**: A physical item tracked in the Asset Register
- **InsuranceRecord**: An entry in the Insurance Register describing an insurable risk
- **Unified Register**: The Kenya model where every Asset creation simultaneously produces a linked InsuranceRecord with status `'Insured'` and zero coverage variance
- **Claim**: A formal insurance claim submitted to or being managed with an insurer
- **IncidentNotification**: A new intake record capturing the first report of a loss or damage event; the top of the claims funnel
- **Auto-Sync (SA)**: The existing feature that auto-creates a `Pending Review` InsuranceRecord when a South Africa asset is created
- **1:1 Auto-Sync (KE)**: The Kenya feature that directly creates an `'Insured'` InsuranceRecord when a Kenya asset is created — no scoring engine, no Pending Review
- **document_link**: A mandatory field on Kenya InsuranceRecords storing the purchase invoice URL or PR reference — serves as proof of value for audits
- **incident_ref**: A human-readable unique identifier for an IncidentNotification, formatted `INC-YYYY-NNN`
- **ZAR**: South African Rand, symbol `R`
- **KES**: Kenyan Shilling, symbol `KSh`

---

## Requirements

---

### Requirement 1: Region Enum on User Model

**User Story:** As a super_admin, I want user accounts to carry a validated region value, so that I can reliably filter and assign users to either South Africa or Kenya without free-text errors.

#### Acceptance Criteria

1. THE System SHALL store the `region` field on every User document using the enum `['South Africa', 'Kenya']`, replacing the current free-text string.
2. WHEN a User document with a `region` value outside `['South Africa', 'Kenya']` is submitted, THE System SHALL reject the request with HTTP 422 and a descriptive validation error.
3. WHEN a super_admin creates or invites a user, THE System SHALL permit assignment to either `'South Africa'` or `'Kenya'`.
4. WHEN an admin creates or invites a user, THE System SHALL restrict the assignable region to the admin's own region.
5. THE System SHALL add `'super_admin'` to the User role enum alongside the existing values `['admin', 'campus_manager', 'viewer']`.
6. WHEN a user is assigned the `'super_admin'` role, THE System SHALL not enforce any region filter on that user's data queries.

---

### Requirement 2: Region Field on Campus Model

**User Story:** As an admin, I want every campus to be tagged with its region, so that the system can automatically scope my views to the campuses in my region.

#### Acceptance Criteria

1. THE System SHALL store the `region` field on every Campus document using the enum `['South Africa', 'Kenya']`.
2. THE System SHALL seed the following ten Kenya campuses with `region = 'Kenya'` if they do not already exist: `Network`, `Tatu Boys`, `Tatu Girls`, `Tatu Primary`, `Athi Primary`, `Eldoret Boys`, `Eldoret Girls`, `Tatu Shared`, `Tatu International`, `Eldoret Primary`.
3. THE System SHALL ensure the existing South Africa campuses (`Ruimsig`, `Paulshof`, `Midrand`, `Boksburg`, `North Riding`) have `region = 'South Africa'`.
4. WHEN a Campus document is created without a `region` value, THE System SHALL default `region` to `'South Africa'`.

---

### Requirement 3: Region-Scoped Data Access

**User Story:** As an admin or campus_manager, I want every module to show only data relevant to my region or campus, so that I never accidentally view or modify another region's records.

#### Acceptance Criteria

1. WHILE the authenticated user has role `admin`, THE System SHALL filter all Asset, InsuranceRecord, Claim, IncidentNotification, and Reconciliation queries to records whose `subsidiary` belongs to a Campus in the user's region.
2. WHILE the authenticated user has role `campus_manager`, THE System SHALL filter all queries to records whose `subsidiary` matches the user's assigned campus.
3. WHILE the authenticated user has role `viewer`, THE System SHALL filter all queries to records whose `subsidiary` belongs to a Campus in the user's region, and SHALL deny any write operation with HTTP 403.
4. WHILE the authenticated user has role `super_admin`, THE System SHALL apply no region or campus filter to any query.
5. WHEN an admin or campus_manager attempts to read or write a record that belongs to a different region, THE System SHALL return HTTP 403.
6. THE System SHALL apply region scoping consistently across the Dashboard, Asset Register, Insurance Register, Reconciliation, Claims, Incident Notifications, and Reports modules.

---

### Requirement 4: Currency Display by Region

**User Story:** As a user, I want monetary values displayed in my region's currency, so that financial figures are immediately meaningful without manual conversion.

#### Acceptance Criteria

1. WHEN the authenticated user's region is `'South Africa'`, THE System SHALL display all monetary values prefixed with the symbol `R`.
2. WHEN the authenticated user's region is `'Kenya'`, THE System SHALL display all monetary values prefixed with the symbol `KSh`.
3. WHEN the authenticated user is a `super_admin` with no region, THE System SHALL display both currency symbols alongside the relevant data or default to displaying values without a currency prefix.
4. THE System SHALL derive the currency symbol from the user's `region` field; no separate currency field SHALL be stored on User or Campus.

---

### Requirement 5: Kenya Unified Register — Mandatory Document Link

**User Story:** As a Kenya campus_manager, I want to attach a purchase invoice or PR reference to each asset record at the point of entry, so that proof of value is captured immediately and is available during insurance audits and claims.

#### Acceptance Criteria

1. WHEN adding or editing an InsuranceRecord whose `subsidiary` belongs to a Kenya campus, THE System SHALL present a mandatory `document_link` field.
2. THE System SHALL accept `document_link` as either a URL string (Google Drive link, NetSuite link, etc.) or a file upload in PDF, JPG, or PNG format (max 10 MB).
3. IF a Kenya InsuranceRecord is submitted without a `document_link` value, THEN THE System SHALL reject the request with HTTP 422 and a message indicating that the invoice/document link is required for Kenya records.
4. IF an uploaded document file exceeds 10 MB, THEN THE System SHALL reject the upload with HTTP 422 and an error message stating the size limit.
5. WHEN a `document_link` file is uploaded and accepted, THE System SHALL store `filename`, `originalName`, `mimetype`, `size`, and `url` metadata on the InsuranceRecord document.
6. WHEN an InsuranceRecord has a `document_link`, THE Insurance Register table SHALL display a clickable link or icon in the document column for that row.
7. THE System SHALL not require `document_link` for South Africa InsuranceRecords; the mandatory validation SHALL apply exclusively to Kenya records.
8. THE System SHALL also accept an optional `pr_ref` (String) field on Kenya InsuranceRecords for the associated Purchase Request reference number.

---

### Requirement 6: Kenya 1:1 Auto-Sync (Unified Register)

**User Story:** As a Kenya campus_manager, I want every asset I create to be instantly treated as an insured item, so that the Asset Register and Insurance Register are always identical and no reconciliation work is needed.

#### Acceptance Criteria

1. WHEN a Kenya asset is created (i.e., the asset's `subsidiary` belongs to a Campus with `region = 'Kenya'`), THE System SHALL immediately and directly create a linked InsuranceRecord for that asset without running any similarity scoring or matching engine.
2. THE System SHALL create the InsuranceRecord with `status = 'Insured'`, `sumInsured` equal to the asset's `sumInsured`, and `linkedAssetId` set to the new asset's `_id`.
3. THE System SHALL set `Asset.linkedInsuranceRecordId` to the newly created InsuranceRecord's `_id` and `Asset.insuranceStatus` to `'Insured'` as part of the same operation.
4. THE System SHALL set the InsuranceRecord's `subsidiary`, `classOfInsurance`, `descriptionDetails`, `serialNumber`, `quantity`, and `unitCost` from the corresponding asset fields.
5. THE System SHALL NOT run the similarity scoring engine (0–100 score) for Kenya assets; the 1:1 sync is deterministic and unconditional.
6. THE System SHALL NOT create a `Pending Review` InsuranceRecord for Kenya assets; the `Pending Review` status and the Auto-Sync (SA) behaviour are exclusively for South Africa.
7. WHEN a Kenya asset is updated and its `sumInsured`, `quantity`, `unitPrice`, or `description` changes, THE System SHALL mirror those field changes to the linked InsuranceRecord immediately.
8. WHEN the 1:1 auto-sync fails internally during asset creation, THE System SHALL still return a successful HTTP 201 response for the asset and SHALL log the sync failure with the asset ID.
9. THE System SHALL compute a coverage variance of `0.00` for all Kenya assets that have been synced, reflecting that asset value equals insured value by design.

---

### Requirement 7: IncidentNotification Entity

**User Story:** As a campus_manager or admin, I want to log an incident notification directly in SAIT, so that the initial report of a loss or damage event is captured in the system without relying on an external Google Form.

#### Acceptance Criteria

1. THE System SHALL provide a dedicated `IncidentNotification` collection with the following required fields: `reporter_name` (String), `reporter_email` (String), `campus_id` (ObjectId ref Campus), `incident_date_time` (Date), `timing_type` (Enum `['Occurred', 'Noticed']`), `description` (String), `incident_type` (Enum `['Theft', 'Accidental Damage', 'Natural Disaster', 'Fire', 'Power Surge', 'Other']`).
2. THE System SHALL auto-generate `incident_ref` in the format `INC-YYYY-NNN` (where YYYY is the submission year and NNN is a zero-padded sequential counter per year) upon creation of an IncidentNotification.
3. THE System SHALL auto-set `report_timestamp` to the server's current UTC time when an IncidentNotification is created.
4. THE System SHALL accept the following optional fields on IncidentNotification: `user_id` (ObjectId ref User), `duty_station_detail` (String), `evidence_files` (Array of `{ filename, originalName, mimetype, size }`).
5. THE System SHALL initialise `is_converted_to_claim` to `false` and `linked_claim_id` to `null` on every new IncidentNotification.
6. THE System SHALL enforce the following status enum on IncidentNotification: `['New', 'Under Review', 'Converted', 'Dismissed']`, with `'New'` as the default.
7. WHEN an IncidentNotification is created, THE System SHALL return HTTP 201 with the created document including the auto-generated `incident_ref`.
8. WHEN a campus_manager or admin updates the status of an IncidentNotification, THE System SHALL persist the new status.
9. IF a viewer attempts to create or update an IncidentNotification, THEN THE System SHALL return HTTP 403.
10. WHEN an IncidentNotification is queried by a campus_manager, THE System SHALL return only notifications where `campus_id` matches the user's assigned campus.
11. WHEN an IncidentNotification is queried by an admin, THE System SHALL return only notifications where the referenced Campus belongs to the admin's region.
12. WHEN an IncidentNotification is submitted from a Kenya campus, THE System SHALL send a bell notification to all admin users with `region = 'Kenya'`.
12. WHEN an IncidentNotification is submitted from a Kenya campus, THE System SHALL send a bell notification to all admin users with `region = 'Kenya'`.

---

### Requirement 8: Convert Incident Notification to Claim

**User Story:** As an admin or campus_manager, I want to convert an incident notification into a formal claim with a single action, so that data is not re-entered and the relationship between the incident and the claim is preserved.

#### Acceptance Criteria

1. WHEN an admin or campus_manager triggers "Convert to Claim" on an IncidentNotification with `is_converted_to_claim = false`, THE System SHALL create a new Claim document with `claimStatus = 'Internal WIP'`.
2. WHEN the conversion Claim is created, THE System SHALL carry over the following fields from the IncidentNotification: `campus_id` → `subsidiary`, `incident_date_time` → `dateOfIncident`, `description` → `description`, and the Campus's region → `region`.
3. WHEN the Claim is created by conversion, THE System SHALL set `Claim.linked_incident_id` to the source IncidentNotification's `_id`.
4. WHEN the Claim is created by conversion, THE System SHALL set `IncidentNotification.is_converted_to_claim = true` and `IncidentNotification.linked_claim_id` to the new Claim's `_id` in the same operation.
5. WHEN an admin or campus_manager attempts to convert an IncidentNotification that already has `is_converted_to_claim = true`, THE System SHALL return HTTP 409 with a message indicating the notification has already been converted.
6. WHEN a viewer attempts to convert an IncidentNotification, THE System SHALL return HTTP 403.
7. WHEN the conversion is completed, THE System SHALL return HTTP 201 with the newly created Claim document.

---

### Requirement 9: Claims Pipeline — Status Workflow

**User Story:** As an admin, I want claims to move through a defined set of statuses that reflect the real-world pipeline, so that I can track where each claim stands at a glance.

#### Acceptance Criteria

1. THE System SHALL enforce the following `claimStatus` enum on all Claim documents: `['Internal WIP', 'Lodged', 'Paid Out', 'Rejected', 'Withdrawn', 'Below Minimum Excess']`.
2. THE System SHALL migrate all existing Claim documents with `claimStatus = 'Pending'` to `claimStatus = 'Internal WIP'` as a one-time data migration.
3. WHEN a Claim is created via the Convert to Claim flow, THE System SHALL set its initial `claimStatus` to `'Internal WIP'`.
4. WHEN an admin updates a Claim's `claimStatus` to a value outside the defined enum, THE System SHALL return HTTP 422 with a validation error.
5. THE System SHALL allow an admin to manually set any valid `claimStatus` on any Claim, with no enforced linear transition constraint.

---

### Requirement 10: Claims Pipeline — Extended Fields

**User Story:** As an admin, I want additional tracking fields on each claim, so that I can record insurer communication dates, payout amounts, and other claim-specific details currently maintained in spreadsheets.

#### Acceptance Criteria

1. THE System SHALL add the following optional fields to the Claim schema: `linked_incident_id` (ObjectId ref IncidentNotification), `insurer_notified_date` (Date), `internal_report_date` (Date), `excess_paid` (Number, default 0), `claim_amount_paid` (Number, default 0), `other_replacement` (String), `np_user` (String), `item_pending` (String), `region` (String, enum `['South Africa', 'Kenya']`).
2. THE System SHALL retain the existing Claim fields (`claimId`, `subsidiary`, `dateOfIncident`, `dateOfSubmission`, `dateOfSettlement`, `claimValue`, `description`, `notes`, `incidentFormLink`, `claimFormLink`, `dischargeVoucherLink`, `folderLink`, `documents`, `createdBy`, `updatedBy`) unchanged.
3. WHEN a Claim is created or updated with `excess_paid` or `claim_amount_paid`, THE System SHALL reject values less than 0 with HTTP 422.
4. WHEN a Claim is queried by an admin, THE System SHALL return all new and existing fields.

---

### Requirement 11: Region-Aware Dashboard KPIs

**User Story:** As an admin or campus_manager, I want the dashboard KPIs to reflect only my region's data and show amounts in my currency, so that the figures are operationally meaningful.

#### Acceptance Criteria

1. WHEN the authenticated user is an admin, THE System SHALL filter all dashboard KPIs (total asset value, sum insured, coverage ratio, claims summary) to records whose `subsidiary` belongs to a Campus in the user's region.
2. WHEN the authenticated user is a campus_manager, THE System SHALL filter all dashboard KPIs to records whose `subsidiary` matches the user's campus.
3. WHEN the authenticated user is a super_admin, THE System SHALL aggregate dashboard KPIs across all regions with no filter.
4. THE System SHALL display the appropriate currency symbol (`R` or `KSh`) next to monetary KPI values based on the authenticated user's region.
5. ALL dashboard KPI values SHALL be computed from live MongoDB aggregations. THE System SHALL NOT use hardcoded, mocked, or randomly generated values for any KPI or indicator.
5. ALL dashboard KPI values SHALL be computed from live MongoDB aggregations; THE System SHALL NOT use hardcoded, mocked, or randomly generated values for any KPI.

---

### Requirement 12: Dashboard — Operational Indicators

**User Story:** As an admin, I want at-a-glance counts and summaries specific to my region, so that I can prioritise my daily work without running manual queries.

#### Acceptance Criteria

1. WHEN the authenticated user is a South Africa admin or campus_manager, THE System SHALL include a `pendingReviewCount` indicator showing the count of InsuranceRecords with `status = 'Pending Review'` scoped to the user's region or campus.
2. WHEN the authenticated user is a Kenya admin or campus_manager, THE System SHALL display a **Unified Register Totals** KPI showing that total asset count equals total insured item count (coverage = 100% by design), sourced from live aggregations.
3. WHEN the authenticated user is a Kenya admin, THE System SHALL include a **Matched by Design** indicator showing the count of Kenya assets created in the current calendar month.
4. THE System SHALL include an `openIncidentsCount` indicator for all admin and campus_manager users showing the count of IncidentNotifications with `status` in `['New', 'Under Review']`, scoped to the user's region or campus.
5. THE System SHALL include an `activeClaimsByStatus` breakdown for all admin users showing the count of Claims grouped by `claimStatus`, scoped to the user's region.
6. WHEN the authenticated user is a super_admin, THE System SHALL include all indicators above aggregated across both regions without scoping.
7. WHEN the authenticated user is a viewer, THE System SHALL not include any of the operational indicators in the dashboard response.
8. ALL indicator values SHALL be computed from live MongoDB aggregations; THE System SHALL NOT use hardcoded, mocked, or randomly generated values.

---

### Requirement 13: Kenya Insurance Register — Definitive Field Set

**User Story:** As a Kenya admin, I want the Insurance Register to capture all fields from the Kenya Final_Count spreadsheet, so that the digital record is a complete and auditable replacement for the spreadsheet.

#### Acceptance Criteria

1. THE System SHALL add the following optional fields to the InsuranceRecord schema for Kenya records:
   - `physical_location` (String) — Physical Location of Asset (e.g., "Classrooms", "Dormitory")
   - `procuring_department` (String) — Department that procured the asset (e.g., "KE Academics", "Catering", "Tech")
   - `year_of_purchase` (Number) — Year the asset was purchased
   - `years_of_service` (Number) — How many years the asset has been in service
   - `age_bracket` (String) — Enum-like: `'<2.5 Yrs'`, `'2.5 - 5.0 Yrs'`, `'5.0 - 7.5 Yrs'`, `'7.5 - 10 Yrs'`, `'10> Yrs'`
   - `asset_class` (String) — Granular classification (e.g., `'Equipment - Computers'`, `'Furniture'`, `'Buildings'`) used to link register items to the Claims module
   - `insurance_priority` (String, Enum `['High', 'Medium', 'Low', 'Nil', 'Expensed', 'Leased']`)
   - `insurable_value` (Number) — Actual KES amount subject to insurance (not a percentage)
   - `retire_write_off_date` (Date) — Date the asset was retired, expensed, or written off (optional)
   - `quantity_retired` (Number, default 0) — Number of units retired
   - `retired_asset_value` (Number, default 0) — Value of retired units
   - `asset_usage_status` (String, Enum `['In Use', 'Retired or Lost']`)
   - `document_link` (String) — **Mandatory for Kenya** — invoice/PR document link (see Requirement 5)
   - `pr_ref` (String) — Associated Purchase Request reference number (optional)
   - `ownership` (String, Enum `['NP Owned', 'Leased', 'NCBA Owned', 'Other']`)
2. THE System SHALL treat all Kenya-specific fields as optional on South Africa InsuranceRecord documents; existing SA records SHALL not be required to carry these fields.
3. IF `quantity_retired` or `retired_asset_value` is provided and its value is less than 0, THEN THE System SHALL reject the request with HTTP 422.
4. WHEN a Kenya admin or super_admin views an InsuranceRecord, THE System SHALL return all Kenya-specific fields alongside the existing fields.
5. WHEN an InsuranceRecord is created or updated without the Kenya-specific optional fields, THE System SHALL store the document without those fields.
6. THE `asset_class` field SHALL be used to group and filter InsuranceRecords when a user navigates from a Claim to related insured assets.

---

### Requirement 14: Kenya Unified Register as Authoritative Source

**User Story:** As a Kenya admin, I want the system to treat every Kenya asset as immediately and fully insured, so that there is zero coverage variance and no manual reconciliation work required.

#### Acceptance Criteria

1. THE System SHALL apply the SA Auto-Sync behaviour (auto-creating a `Pending Review` InsuranceRecord) exclusively to assets whose `subsidiary` belongs to a South Africa campus.
2. WHEN a Kenya asset is created, THE System SHALL guarantee a 1:1 linked InsuranceRecord with `status = 'Insured'` — there is no interim unlinked state for Kenya assets.
3. THE System SHALL compute and store `coverageVariance = 0.00` for all Kenya InsuranceRecords created via the 1:1 auto-sync.
4. WHEN a Kenya admin manually creates or edits an InsuranceRecord via the Insurance Register UI, THE System SHALL permit this action; the Kenya Insurance Register remains writable by admins.
5. THE System SHALL NOT display a reconciliation percentage or coverage gap for Kenya campuses on the dashboard — instead it SHALL display the Unified Register Totals as defined in Requirement 12.

---

### Requirement 15: Incident Notification Evidence Upload

**User Story:** As a campus_manager or admin, I want to attach photos and supporting documents to an incident notification, so that evidence is preserved alongside the incident record for use in the claims process.

#### Acceptance Criteria

1. WHEN creating or updating an IncidentNotification, THE System SHALL accept zero or more evidence file uploads.
2. THE System SHALL accept evidence files in PDF, JPG, PNG, and MP4 formats; IF a file with an unsupported MIME type is submitted, THEN THE System SHALL reject that file with HTTP 422 and continue processing any remaining valid files.
3. THE System SHALL store `filename`, `originalName`, `mimetype`, and `size` metadata for each accepted evidence file on the IncidentNotification document.
4. WHEN the stored evidence file list is returned in an API response, THE System SHALL include a `url` field for each file that resolves to the accessible file location.

---

### Requirement 16: IncidentNotification Reference Integrity

**User Story:** As an admin, I want the link between an incident notification and its claim to remain consistent, so that navigating from a claim back to the original incident always works.

#### Acceptance Criteria

1. WHEN a Claim created from an IncidentNotification is deleted, THE System SHALL set `IncidentNotification.is_converted_to_claim = false` and `IncidentNotification.linked_claim_id = null` on the source notification.
2. WHEN an IncidentNotification with `is_converted_to_claim = true` is queried, THE System SHALL populate `linked_claim_id` with the referenced Claim document (or return the `_id` if the Claim no longer exists).
3. THE System SHALL not permit deletion of an IncidentNotification that has `is_converted_to_claim = true`; IF such a deletion is attempted, THEN THE System SHALL return HTTP 409 with a message indicating the notification is linked to an active claim.
