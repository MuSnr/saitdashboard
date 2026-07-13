# Requirements Document

## Introduction

The Asset Insurance Auto-Sync feature eliminates duplicate data entry in the SAIT insurance asset management system for Nova Pioneer schools. When a campus manager (or admin) creates an asset in the Asset Register, the system automatically creates a corresponding Insurance Register record pre-populated with all fields that can be derived from the asset data. When those asset fields are later edited, the linked insurance record's mirrored fields update in lockstep. Admin users see a dashboard indicator showing how many insurance records are awaiting completion ("Pending Review"), and campus managers are restricted to read-only access on the Insurance Register.

## Glossary

- **System**: The SAIT backend API and frontend React application.
- **Asset_Register**: The module that stores asset data; backed by the `Asset` MongoDB collection.
- **Insurance_Register**: The module that stores insurance records; backed by the `InsuranceRecord` MongoDB collection.
- **Asset**: A single document in the Asset Register with fields including `subsidiary`, `insuranceClass`, `description`, `serialNumber`, `quantity`, `unitPrice`, `sumInsured`, and `linkedInsuranceRecordId`.
- **InsuranceRecord**: A single document in the Insurance Register with fields including `subsidiary`, `classOfInsurance`, `descriptionDetails`, `assetOrInsurableRisk`, `serialNumber`, `quantity`, `unitCost`, `sumInsured`, `status`, and `linkedAssetId`.
- **Auto-Sync**: The automatic creation and subsequent field mirroring of an InsuranceRecord from an Asset.
- **Mirrored_Fields**: The subset of InsuranceRecord fields whose values are sourced from the linked Asset: `subsidiary`, `classOfInsurance`, `descriptionDetails`, `assetOrInsurableRisk`, `serialNumber`, `quantity`, `unitCost`, `sumInsured`.
- **Insurance-Specific_Fields**: Fields on InsuranceRecord that only admin can populate: `monthlyPremium`, `annualPremium`, `rate`, `policyReference`, `vendor`, `interestNoted`.
- **Pending_Review**: The new InsuranceRecord status value that marks a record as auto-created and awaiting admin completion.
- **campus_manager**: A user role that can create and edit assets but has read-only access to the Insurance Register.
- **admin**: A user role that has full read/write access to both registers.
- **viewer**: A user role with read-only access to all modules.
- **Dashboard**: The Executive Dashboard page (`/`) that displays KPI cards and coverage analytics.
- **Pending_Review_Badge**: A numeric indicator on the Dashboard showing the count of InsuranceRecords with status `Pending Review`.

---

## Requirements

### Requirement 1: Auto-Creation of Insurance Record on Asset Creation

**User Story:** As a campus manager, I want an insurance record to be automatically created when I add a new asset individually, so that I do not need to manually re-enter the same information in the Insurance Register.

#### Acceptance Criteria

1. WHEN a campus manager or admin submits a valid asset creation request via `POST /api/assets` (single record), THE System SHALL create a new InsuranceRecord in the same database transaction scope before returning the asset creation response.
2. WHEN the System creates the auto-synced InsuranceRecord, THE System SHALL set the record's `status` field to `Pending Review`.
3. WHEN the System creates the auto-synced InsuranceRecord, THE System SHALL map the following fields from the Asset to the InsuranceRecord:
   - `Asset.subsidiary` → `InsuranceRecord.subsidiary`
   - `Asset.insuranceClass` → `InsuranceRecord.classOfInsurance`
   - `Asset.description` → `InsuranceRecord.descriptionDetails`
   - `Asset.description` → `InsuranceRecord.assetOrInsurableRisk`
   - `Asset.serialNumber` → `InsuranceRecord.serialNumber`
   - `Asset.quantity` → `InsuranceRecord.quantity`
   - `Asset.unitPrice` → `InsuranceRecord.unitCost`
   - `Asset.sumInsured` → `InsuranceRecord.sumInsured`
4. WHEN the System creates the auto-synced InsuranceRecord, THE System SHALL leave the following Insurance-Specific_Fields blank (zero or empty string): `monthlyPremium`, `annualPremium`, `rate`, `policyReference`, `vendor`, `interestNoted`.
5. WHEN the auto-synced InsuranceRecord is created, THE System SHALL set `InsuranceRecord.linkedAssetId` to the new Asset's `_id` and SHALL set `Asset.linkedInsuranceRecordId` to the new InsuranceRecord's `_id`, establishing a bidirectional link.
6. WHEN the auto-synced InsuranceRecord is created, THE System SHALL set the `InsuranceRecord.createdBy` field to the authenticated user's `_id`.
7. IF the auto-synced InsuranceRecord creation fails due to a database error, THEN THE System SHALL log the error and SHALL still return a successful asset creation response to the client, ensuring the asset creation is not blocked by the insurance sync failure.

---

### Requirement 2: Field Mirroring on Asset Edit

**User Story:** As a campus manager, I want changes I make to an asset's core fields to be automatically reflected in the linked insurance record, so that the Insurance Register stays accurate without requiring admin to manually update it.

#### Acceptance Criteria

1. WHEN a campus manager or admin submits a valid asset update request via `PUT /api/assets/:id` and the Asset has a `linkedInsuranceRecordId`, THE System SHALL update the Mirrored_Fields on the linked InsuranceRecord to match the updated Asset values.
2. WHEN the System propagates Asset field changes to the linked InsuranceRecord, THE System SHALL update only the Mirrored_Fields and SHALL NOT overwrite any Insurance-Specific_Fields on the InsuranceRecord.
3. WHEN `Asset.quantity` or `Asset.unitPrice` is updated, THE System SHALL recalculate `Asset.sumInsured` as `quantity × unitPrice` and SHALL update `InsuranceRecord.sumInsured` with the recalculated value.
4. WHEN the System propagates field changes to the linked InsuranceRecord and the InsuranceRecord's current `status` is `Pending Review`, THE System SHALL retain the `Pending Review` status and SHALL NOT change it during mirroring.
5. IF the linked InsuranceRecord field-mirror operation fails due to a database error, THEN THE System SHALL log the error and SHALL still return a successful asset update response to the client, ensuring the asset update is not blocked.

---

### Requirement 3: Bidirectional Link Integrity

**User Story:** As an admin, I want the link between an asset and its insurance record to be maintained consistently on both documents, so that reconciliation reports remain accurate.

#### Acceptance Criteria

1. THE System SHALL ensure that `Asset.linkedInsuranceRecordId` and `InsuranceRecord.linkedAssetId` always reference each other symmetrically when a link exists (i.e., if Asset A references InsuranceRecord B, then InsuranceRecord B references Asset A).
2. WHEN an Asset that has a linked InsuranceRecord is deleted via `DELETE /api/assets/:id`, THE System SHALL retain the linked InsuranceRecord and SHALL clear `InsuranceRecord.linkedAssetId` (set it to `null`) on that InsuranceRecord, preserving the record in the Insurance Register as an audit trail.
3. WHEN an InsuranceRecord that has a linked Asset is deleted via `DELETE /api/insurance-register/:id`, THE System SHALL clear `Asset.linkedInsuranceRecordId` on the previously linked Asset and SHALL set `Asset.insuranceStatus` to `Not Insured`.
4. WHEN an admin manually clears the link on an Asset (sets `linkedInsuranceRecordId` to `null`), THE System SHALL also clear `InsuranceRecord.linkedAssetId` on the previously linked InsuranceRecord.
5. THE System SHALL prevent two Assets from being linked to the same InsuranceRecord simultaneously.
6. THE System SHALL prevent two InsuranceRecords from being linked to the same Asset simultaneously.

---

### Requirement 4: Pending Review Status in Insurance Register

**User Story:** As a system, I need a "Pending Review" status value in the Insurance Register so that auto-created records can be distinguished from manually created and admin-completed records.

#### Acceptance Criteria

1. THE Insurance_Register SHALL support `Pending Review` as a valid value for `InsuranceRecord.status`, in addition to the existing values: `Active`, `Insured`, `Request Removal`, `Request Addition`, `Request Update`, `Removed`.
2. WHEN an InsuranceRecord has `status` equal to `Pending Review`, THE System SHALL display the record in the Insurance Register table with a visually distinct badge (amber/orange colour) that differentiates it from `Active` and other statuses.
3. WHEN an admin updates an InsuranceRecord's Insurance-Specific_Fields and saves the record, THE System SHALL allow the admin to manually change the `status` away from `Pending Review` to any other valid status value.
4. THE System SHALL include `Pending Review` as a selectable option in the status dropdown of the Insurance Register edit form for admin users.

---

### Requirement 5: Dashboard Pending Review Badge

**User Story:** As an admin, I want to see a count of insurance records awaiting completion on my dashboard, so that I know how many auto-created records need my attention.

#### Acceptance Criteria

1. WHEN the Dashboard loads for an admin user, THE Dashboard SHALL display a Pending_Review_Badge showing the count of InsuranceRecords with `status` equal to `Pending Review`.
2. WHEN there are zero InsuranceRecords with `status` equal to `Pending Review`, THE Dashboard SHALL display the Pending_Review_Badge with a count of `0` or SHALL hide the badge.
3. WHEN the admin navigates from the Dashboard Pending_Review_Badge to the Insurance Register, THE Insurance_Register SHALL display with a filter pre-applied to show only `Pending Review` records, or SHALL clearly indicate how many such records exist.
4. THE System SHALL expose the Pending Review count via the existing `GET /api/dashboard/analytics` endpoint response, so no additional API call is required by the frontend.
5. WHEN the Dashboard is viewed by a campus_manager or viewer role, THE Dashboard SHALL NOT display the Pending_Review_Badge.

---

### Requirement 6: Role-Based Access Control on Insurance Register

**User Story:** As a campus manager, I want to view insurance records for my campus so that I can see the insurance status of my assets, but I should not be able to edit those records since insurance data is managed by admin.

#### Acceptance Criteria

1. WHEN a campus_manager sends a `GET /api/insurance-register` request, THE System SHALL return only the InsuranceRecords where `subsidiary` matches the campus_manager's assigned campus.
2. WHEN a campus_manager attempts a `POST /api/insurance-register`, `PUT /api/insurance-register/:id`, or `DELETE /api/insurance-register/:id` request, THE System SHALL return HTTP 403 with a descriptive error message.
3. WHILE a campus_manager is viewing the Insurance Register page, THE Insurance_Register SHALL render the table in read-only mode with no visible "Add Record", "Edit", or "Delete" controls.
4. WHILE an admin is viewing the Insurance Register page, THE Insurance_Register SHALL display "Add Record", edit, and delete controls as currently implemented.
5. WHEN a viewer sends any request to `/api/insurance-register`, THE System SHALL return HTTP 403 with a descriptive error message.

---

### Requirement 7: Bulk Import Excluded from Auto-Sync

**User Story:** As an admin, I want bulk-imported assets to be excluded from auto-sync, so that the Insurance Register is not flooded with incomplete auto-created records during large data migrations, and I can bulk import insurance records separately when needed.

#### Acceptance Criteria

1. WHEN assets are created via `POST /api/assets/bulk`, THE System SHALL NOT auto-create any InsuranceRecord for the imported assets.
2. WHEN assets are created via `POST /api/assets/bulk`, THE System SHALL leave the `linkedInsuranceRecordId` field on each imported Asset as `null`.
3. THE System SHALL restrict `POST /api/assets/bulk` to admin users only, ensuring campus managers cannot trigger bulk imports.
