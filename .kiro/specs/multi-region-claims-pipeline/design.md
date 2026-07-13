# Design Document — Multi-Region & Claims Pipeline

## Overview

This feature extends SAIT from a single-region (South Africa) system to a dual-region platform supporting both South Africa (SA) and Kenya (KE), while introducing a formal Incident Notification → Claims Pipeline and a Kenya Unified Register model.

### Key design decisions

- **Region is derived from Campus** — Assets, InsuranceRecords, and Claims do not store a region field directly; region is resolved by looking up the campus in the Campus collection. This avoids data duplication and keeps region scoping consistent. The one exception is the Claim model, which stores `region` as a denormalized field for faster dashboard aggregations.
- **Kenya Unified Register = 1:1 Auto-Sync** — When a Kenya asset is created, `keAutoSync()` immediately and deterministically creates an `'Insured'` InsuranceRecord. No scoring engine, no Pending Review. SA continues to use the existing `autoCreateInsuranceRecord()` (Pending Review) path.
- **RegionService** — A new `services/regionService.js` provides helpers to resolve campus→region and region→campuses. All controllers call these helpers to scope queries, rather than duplicating the logic.
- **IncidentNotification is the claims funnel entry point** — The existing Claims module continues to work; the new Incident module sits above it. A "Convert to Claim" action bridges the two.
- **Bell notifications via User.unreadNotifications** — Rather than a separate Notifications collection, each User document gets an `unreadNotifications` counter. When a KE incident is created, all KE admin users have their counter incremented. The frontend polls on mount.
- **All dashboard KPIs computed from live aggregations** — The two hardcoded values (`replacementValueChange: 5.0`, `sumInsuredChange: 2.3`) in `DashboardController` are removed and replaced with null/0 until historical comparison data exists.

---

## Architecture

```
Frontend (React/Vite)
  AuthContext  ←  adds region, isSuperAdmin, currencySymbol
  Dashboard    ←  region-aware KPIs + indicators
  Incidents    ←  new page, replaces Google Form
  Claims       ←  updated statuses + new fields + link to incident
  InsuranceRegister ← Kenya fields + mandatory document_link
  Layout       ←  bell icon with unread count badge

Backend (Express/MongoDB)
  middleware/auth.js        ← adds region scoping helpers
  services/regionService.js ← new — campus↔region resolution
  services/reconciliationService.js ← new keAutoSync()
  models/
    User        ← role enum + region enum + unreadNotifications
    Campus      ← region enum + KE campus seeding
    InsuranceRecord ← KE-specific fields
    Claim       ← updated status enum + extended fields + region
    IncidentNotification ← new model
  controllers/
    AssetController       ← region-aware auto-sync routing
    InsuranceController   ← KE document_link validation
    DashboardController   ← region-aware, live aggregations only
    ClaimController       ← updated statuses + extended fields
    IncidentController    ← new
  routes/
    incidentRoutes.js     ← new
```

---

## Data Models

### User (updated)

```js
role: {
  type: String,
  enum: ['super_admin', 'admin', 'campus_manager', 'viewer'],  // added super_admin
  default: 'viewer',
},
region: {
  type: String,
  enum: ['South Africa', 'Kenya'],  // changed from free-text String
  default: 'South Africa',
},
unreadNotifications: { type: Number, default: 0 },  // new — KE bell counter
```

### Campus (updated)

```js
region: {
  type: String,
  enum: ['South Africa', 'Kenya'],
  default: 'South Africa',
},
```

Campus seeding in `index.js` — add KE campuses alongside existing SA campuses:
```js
const KE_CAMPUSES = [
  { name: 'Network',         shortName: 'KEN', initials: 'KEN', region: 'Kenya' },
  { name: 'Tatu Boys',       shortName: 'NTB', initials: 'NTB', region: 'Kenya' },
  { name: 'Tatu Girls',      shortName: 'NTG', initials: 'NTG', region: 'Kenya' },
  { name: 'Tatu Primary',    shortName: 'NTP', initials: 'NTP', region: 'Kenya' },
  { name: 'Athi Primary',    shortName: 'NAP', initials: 'NAP', region: 'Kenya' },
  { name: 'Eldoret Boys',    shortName: 'NEB', initials: 'NEB', region: 'Kenya' },
  { name: 'Eldoret Girls',   shortName: 'NEG', initials: 'NEG', region: 'Kenya' },
  { name: 'Tatu Shared',     shortName: 'NTS', initials: 'NTS', region: 'Kenya' },
  { name: 'Tatu International', shortName: 'NTI', initials: 'NTI', region: 'Kenya' },
  { name: 'Eldoret Primary', shortName: 'NEP', initials: 'NEP', region: 'Kenya' },
];
// Upsert each by name — idempotent on every cold start
```

### InsuranceRecord (updated — KE fields added)

```js
// Existing fields unchanged ...

// Kenya-specific optional fields
physical_location:     { type: String, default: '' },
procuring_department:  { type: String, default: '' },
year_of_purchase:      { type: Number, default: null },
years_of_service:      { type: Number, default: null },
age_bracket: {
  type: String,
  enum: ['<2.5 Yrs', '2.5 - 5.0 Yrs', '5.0 - 7.5 Yrs', '7.5 - 10 Yrs', '10> Yrs', ''],
  default: '',
},
asset_class:           { type: String, default: '' },
insurance_priority: {
  type: String,
  enum: ['High', 'Medium', 'Low', 'Nil', 'Expensed', 'Leased', ''],
  default: '',
},
insurable_value:       { type: Number, default: 0 },
retire_write_off_date: { type: Date, default: null },
quantity_retired:      { type: Number, default: 0 },
retired_asset_value:   { type: Number, default: 0 },
asset_usage_status: {
  type: String,
  enum: ['In Use', 'Retired or Lost', ''],
  default: '',
},
document_link:  { type: String, default: '' },  // mandatory for KE — validated in controller
pr_ref:         { type: String, default: '' },
ownership: {
  type: String,
  enum: ['NP Owned', 'Leased', 'NCBA Owned', 'Other', ''],
  default: '',
},
```

### Claim (updated)

```js
claimStatus: {
  type: String,
  enum: ['Internal WIP', 'Lodged', 'Paid Out', 'Rejected', 'Withdrawn', 'Below Minimum Excess'],
  default: 'Internal WIP',
},

// New fields
linked_incident_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'IncidentNotification', default: null },
insurer_notified_date:{ type: Date, default: null },
internal_report_date: { type: Date, default: null },
excess_paid:          { type: Number, default: 0 },
claim_amount_paid:    { type: Number, default: 0 },
other_replacement:    { type: String, default: '' },
np_user:              { type: String, default: '' },
item_pending:         { type: String, default: '' },
region: {
  type: String,
  enum: ['South Africa', 'Kenya'],
  default: 'South Africa',
},
```

**Data migration:** existing Claims with `claimStatus: 'Pending'` → `'Internal WIP'`. Run as a one-time script in `index.js` on startup:
```js
await Claim.updateMany({ claimStatus: 'Pending' }, { $set: { claimStatus: 'Internal WIP' } });
```

### IncidentNotification (new model)

```js
const incidentNotificationSchema = new mongoose.Schema({
  // Reporter
  reporter_name:  { type: String, required: true },
  reporter_email: { type: String, required: true },
  user_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Location
  campus_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
  duty_station_detail: { type: String, default: '' },

  // Timing
  incident_date_time: { type: Date, required: true },
  timing_type: {
    type: String,
    enum: ['Occurred', 'Noticed'],
    required: true,
  },
  report_timestamp: { type: Date, default: () => new Date() },

  // Incident details
  incident_ref: { type: String, unique: true },  // auto INC-YYYY-NNN
  description:  { type: String, required: true },
  incident_type: {
    type: String,
    enum: ['Theft', 'Accidental Damage', 'Natural Disaster', 'Fire', 'Power Surge', 'Other'],
    required: true,
  },

  // Status & pipeline
  status: {
    type: String,
    enum: ['New', 'Under Review', 'Converted', 'Dismissed'],
    default: 'New',
  },
  is_converted_to_claim: { type: Boolean, default: false },
  linked_claim_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', default: null },

  // Evidence
  evidence_files: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate incident_ref on save
incidentNotificationSchema.pre('save', async function () {
  if (!this.incident_ref) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('IncidentNotification')
      .countDocuments({ incident_ref: { $regex: `^INC-${year}-` } });
    this.incident_ref = `INC-${year}-${String(count + 1).padStart(3, '0')}`;
  }
});
```

---

## Backend Services

### services/regionService.js (new)

```js
const Campus = require('../models/Campus');

// Returns array of campus name strings for a given region
async function getCampusNamesByRegion(region) {
  const campuses = await Campus.find({ region }).select('name').lean();
  return campuses.map((c) => c.name);
}

// Returns the region for a given campus name
async function getCampusRegion(campusName) {
  const campus = await Campus.findOne({ name: campusName }).select('region').lean();
  return campus?.region || 'South Africa';
}

// Returns a MongoDB filter object scoped to the authenticated user
async function getRegionFilter(user) {
  if (user.role === 'super_admin') return {};
  if (user.role === 'campus_manager') return { subsidiary: user.campus };
  // admin or viewer — scope to all campuses in their region
  const campusNames = await getCampusNamesByRegion(user.region);
  return { subsidiary: { $in: campusNames } };
}

module.exports = { getCampusNamesByRegion, getCampusRegion, getRegionFilter };
```

### services/reconciliationService.js — new `keAutoSync(asset, userId)`

```js
async function keAutoSync(asset, userId) {
  // 1:1 deterministic sync — no scoring engine
  const ir = await InsuranceRecord.create({
    subsidiary:           asset.subsidiary,
    classOfInsurance:     asset.insuranceClass,
    descriptionDetails:   asset.description,
    assetOrInsurableRisk: asset.description,
    serialNumber:         asset.serialNumber || '',
    quantity:             asset.quantity     || 1,
    unitCost:             asset.unitPrice    || 0,
    sumInsured:           asset.sumInsured   || 0,
    status:               'Insured',          // NOT 'Pending Review'
    linkedAssetId:        asset._id,
    linkedAt:             new Date(),
    // document_link left empty — user adds after
    createdBy: userId,
  });

  await Asset.findByIdAndUpdate(asset._id, {
    linkedInsuranceRecordId: ir._id,
    insuranceStatus:         'Insured',
  });

  logger.info(`KE 1:1 auto-sync: Asset ${asset.assetId} ↔ InsuranceRecord ${ir._id}`);
  return ir;
}
```

---

## Backend Controllers

### AssetController.createAsset — region routing

After `Asset.create` succeeds, determine the campus region and route to the correct sync:

```js
// Fire-and-forget — never blocks HTTP response
getCampusRegion(asset.subsidiary).then((region) => {
  if (region === 'Kenya') {
    keAutoSync(asset, req.user._id).catch((e) =>
      logger.warn(`KE auto-sync failed for ${asset.assetId}: ${e.message}`)
    );
  } else {
    autoCreateInsuranceRecord(asset, req.user._id).catch((e) =>
      logger.warn(`SA auto-sync failed for ${asset.assetId}: ${e.message}`)
    );
  }
});
```

### InsuranceController — KE document_link validation

In `createRecord` and `updateRecord`, after reading `req.body.subsidiary`:
```js
const campusRegion = await getCampusRegion(req.body.subsidiary || existingRecord?.subsidiary);
if (campusRegion === 'Kenya' && !req.body.document_link) {
  return res.status(422).json({
    success: false,
    message: 'document_link (invoice/PR reference) is required for Kenya records.',
  });
}
```

### DashboardController — region-aware, live aggregations

Replace hardcoded values and add region scoping:

```js
const { getRegionFilter } = require('../services/regionService');

const getDashboardAnalytics = async (req, res) => {
  const campusFilter = await getRegionFilter(req.user);
  const isKE = req.user.region === 'Kenya';
  const isSA = req.user.region === 'South Africa';

  const [
    assetsByCampus, assetsByClass,
    insuranceAgg, insuranceByClass, insuranceByCampus,
    claimsAgg, campuses, pendingReviewCount,
    openIncidentsCount, claimsByStatus,
    matchedByDesignCount,  // KE only
  ] = await Promise.all([
    // ... existing aggregations using campusFilter ...
    InsuranceRecord.countDocuments({ ...campusFilter, status: 'Pending Review' }),
    IncidentNotification.countDocuments({
      // scope by campus_id → campuses in user's region
      ...(req.user.role !== 'super_admin' && {
        campus_id: { $in: await Campus.find(
          req.user.role === 'campus_manager'
            ? { name: req.user.campus }
            : { region: req.user.region }
        ).select('_id') }
      }),
      status: { $in: ['New', 'Under Review'] },
    }),
    Claim.aggregate([
      { $match: { ...campusFilter } },
      { $group: { _id: '$claimStatus', count: { $sum: 1 } } },
    ]),
    isKE
      ? Asset.countDocuments({
          ...campusFilter,
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        })
      : Promise.resolve(0),
  ]);

  // Unified Register Totals for KE
  const keAssetCount     = isKE ? (await Asset.countDocuments(campusFilter)) : null;
  const keInsuredCount   = isKE ? (await InsuranceRecord.countDocuments({ ...campusFilter, status: 'Insured' })) : null;

  return res.status(200).json({
    success: true,
    // ... existing fields ...
    // REMOVED: replacementValueChange and sumInsuredChange hardcoded values
    replacementValueChange: null,
    sumInsuredChange: null,
    // New fields
    pendingReviewCount: isSA ? pendingReviewCount : undefined,
    openIncidentsCount,
    claimsByStatus,
    keUnifiedTotals: isKE ? { assetCount: keAssetCount, insuredCount: keInsuredCount, coveragePct: 100 } : undefined,
    matchedByDesignCount: isKE ? matchedByDesignCount : undefined,
  });
};
```

### IncidentController (new)

```js
// POST /api/incidents
const createIncident = async (req, res) => {
  // Create notification, auto-generate incident_ref via pre-save hook
  // If campus is KE, increment unreadNotifications on all KE admins (fire-and-forget)
  User.updateMany(
    { role: 'admin', region: 'Kenya' },
    { $inc: { unreadNotifications: 1 } }
  ).catch((e) => logger.warn('Bell notification update failed:', e.message));
};

// POST /api/incidents/:id/convert
const convertToClaim = async (req, res) => {
  const incident = await IncidentNotification.findById(req.params.id).populate('campus_id');
  if (incident.is_converted_to_claim) {
    return res.status(409).json({ success: false, message: 'Already converted to a claim.' });
  }
  const claim = await Claim.create({
    subsidiary:       incident.campus_id.name,
    dateOfIncident:   incident.incident_date_time,
    dateOfSubmission: new Date(),
    description:      incident.description,
    claimStatus:      'Internal WIP',
    region:           incident.campus_id.region,
    linked_incident_id: incident._id,
    createdBy: req.user._id,
  });
  await IncidentNotification.findByIdAndUpdate(incident._id, {
    is_converted_to_claim: true,
    linked_claim_id: claim._id,
    status: 'Converted',
  });
  return res.status(201).json({ success: true, claim });
};

// GET /api/users/me/notifications/read — mark all read
const markNotificationsRead = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { unreadNotifications: 0 });
  return res.status(200).json({ success: true });
};
```

### incidentRoutes.js (new)

```js
router.get('/',           protect, getIncidents);
router.post('/',          protect, authorize('admin', 'campus_manager'), upload.array('evidence', 10), createIncident);
router.put('/:id',        protect, authorize('admin', 'campus_manager'), updateIncident);
router.post('/:id/convert', protect, authorize('admin', 'campus_manager'), convertToClaim);
router.delete('/:id',     protect, authorize('admin'), deleteIncident);
```

Add to `index.js`:
```js
const incidentRoutes = require('./routes/incidentRoutes');
app.use('/api/incidents', incidentRoutes);
```

Also add bell mark-read route to userRoutes:
```js
router.put('/notifications/read', protect, markNotificationsRead);
```

---

## Frontend Components

### AuthContext.jsx — expose region helpers

Add to the context value:
```jsx
const region         = user?.region || 'South Africa'
const isSuperAdmin   = user?.role === 'super_admin'
const currencySymbol = region === 'Kenya' ? 'KSh' : 'R'
const isKenya        = region === 'Kenya'
const isSouthAfrica  = region === 'South Africa'
```

### Dashboard.jsx — region-aware KPIs

- Replace `fmt(n)` calls that prefix `R` with `${currencySymbol} ${fmt(n)}`
- Remove the two stats cards that used `replacementValueChange` and `sumInsuredChange` (now null)
- Add region-specific indicator cards:
  - SA: existing Pending Review amber card
  - KE: **Unified Register Totals** card (green, shows asset count = insured count = 100%)
  - KE: **Matched by Design** card (shows this month's auto-synced count)
  - All: **Open Incidents** card (amber, links to `/incidents`)
  - All: **Active Claims by Status** mini breakdown

### src/pages/Incidents.jsx (new page)

Full page with:
- Header with "New Incident" button
- Stats row: total, New, Under Review, Converted, Dismissed counts
- Filter bar: status, campus, incident type, date range
- Table with columns: Ref, Status, Campus, Type, Reporter, Date, Description, Evidence, Actions
- Create/edit dialog: reporter name/email, campus selector, timing type, incident type, description, duty station, evidence file upload
- "Convert to Claim" button — admin/campus_manager only, disabled if already converted
- Linked claim badge/link when `is_converted_to_claim = true`

### App.jsx — add Incidents route

```jsx
<Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
```

### Layout.jsx — bell icon with live badge

```jsx
const { user } = useAuth()
const [unread, setUnread] = useState(0)

useEffect(() => {
  if (user?.unreadNotifications > 0) setUnread(user.unreadNotifications)
}, [user])

const handleBellClick = async () => {
  setUnread(0)
  await api.put('/users/notifications/read')
  navigate('/incidents')
}
```

Replace static bell with:
```jsx
<button onClick={handleBellClick} className="relative p-2 ...">
  <Bell size={18} />
  {unread > 0 && (
    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
      {unread > 9 ? '9+' : unread}
    </span>
  )}
</button>
```

Add "Incidents" to nav:
```jsx
{ label: 'Incidents', icon: AlertCircle, href: '/incidents' }
```

### Claims.jsx — updated statuses + new fields

```jsx
const STATUSES = ['Internal WIP', 'Lodged', 'Paid Out', 'Rejected', 'Withdrawn', 'Below Minimum Excess']

const statusColour = {
  'Internal WIP':        'bg-yellow-100 text-yellow-700',
  'Lodged':              'bg-blue-100 text-blue-700',
  'Paid Out':            'bg-green-100 text-green-700',
  'Rejected':            'bg-red-100 text-red-700',
  'Withdrawn':           'bg-gray-100 text-gray-600',
  'Below Minimum Excess':'bg-orange-100 text-orange-700',
}
```

Add to the create/edit form:
- `excess_paid`, `claim_amount_paid` (number inputs)
- `np_user` (text — staff member involved)
- `item_pending` (text — what's outstanding)
- `insurer_notified_date`, `internal_report_date` (date inputs)
- Linked incident badge when `linked_incident_id` is present (shows incident_ref, links to `/incidents`)

### InsuranceRegister.jsx — Kenya fields + mandatory document_link

When `user.isKenya`:
- Show `document_link` field as required (marked with `*`)
- Show Kenya-specific fields section: `physical_location`, `procuring_department`, `year_of_purchase`, `asset_class`, `insurance_priority`, `insurable_value`, `asset_usage_status`, `ownership`, `quantity_retired`, `retired_asset_value`, `pr_ref`
- Currency: use `currencySymbol` from AuthContext

### api.js — new incident endpoints

```js
export const fetchIncidents     = (params) => api.get('/incidents', { params }).then((r) => r.data?.incidents || [])
export const createIncident     = (data)   => api.post('/incidents', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
export const updateIncident     = (id, data) => api.put(`/incidents/${id}`, data).then((r) => r.data)
export const convertToClaim     = (id)     => api.post(`/incidents/${id}/convert`).then((r) => r.data)
export const markNotificationsRead = ()    => api.put('/users/notifications/read').then((r) => r.data)
```

---

## Correctness Properties

### Property 1: Kenya 1:1 auto-sync creates Insured record, not Pending Review
For any valid Kenya asset creation, the resulting InsuranceRecord SHALL have `status = 'Insured'` and `sumInsured` equal to `asset.sumInsured`. No call to the scoring engine occurs.

### Property 2: SA auto-sync behaviour unchanged
For any South Africa asset creation, the existing `autoCreateInsuranceRecord()` path is taken, producing `status = 'Pending Review'`. The Kenya path does not interfere.

### Property 3: Region filter is applied consistently
For any admin user with region R, all queries return only records whose `subsidiary` belongs to a campus with `region = R`. super_admin receives unfiltered results.

### Property 4: document_link mandatory for Kenya InsuranceRecords
For any Kenya InsuranceRecord creation or update without `document_link`, the API returns HTTP 422. SA records are not affected.

### Property 5: Convert to Claim is idempotent-safe
Calling convertToClaim on an incident with `is_converted_to_claim = true` always returns HTTP 409. Calling it on a fresh incident always creates exactly one Claim and updates both documents atomically.

### Property 6: Dashboard KPIs are live
All numeric values in the dashboard response (KPIs and indicators) come from MongoDB aggregation pipelines executed at request time. No hardcoded or randomly generated values exist in the codebase.

### Property 7: Claim status migration is safe
The one-time migration `updateMany({ claimStatus: 'Pending' }, { $set: { claimStatus: 'Internal WIP' } })` is idempotent — running it multiple times produces the same result.

---

## Error Handling

| Scenario | Handling |
|---|---|
| KE auto-sync fails during asset creation | Fire-and-forget `.catch()` logs warning; asset creation returns HTTP 201 |
| SA auto-sync fails during asset creation | Same fire-and-forget pattern |
| Kenya InsuranceRecord missing document_link | HTTP 422 with descriptive message |
| Convert incident already converted | HTTP 409 |
| Delete incident that has been converted | HTTP 409 |
| Region mismatch — user tries to access other region's data | HTTP 403 |
| Bell notification counter update fails | Fire-and-forget `.catch()` — does not block incident creation response |
| Campus not found in regionService | Falls back to 'South Africa' default with a logger.warn |
