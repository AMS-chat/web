# 🚨 Signals System - Complete Guide

## Overview

The Signals System allows users to report locations, objects, incidents, and services. Approved signals become static objects that appear in search results and help build the community database.

---

## 📋 Key Features

### For Users:
- ✅ Submit 1 signal per day
- ✅ Earn 1 free day when signal is approved
- ✅ Track submission history

### For Admins:
- ✅ Review pending signals
- ✅ Approve → Creates static object with auto-generated login
- ✅ Reject as duplicate
- ✅ Mark as obsolete → Deletes existing object
- ✅ View on map (Google Maps/Yandex/2GIS)

### Static Objects:
- ✅ Always appear in search results (no payment required)
- ✅ Location, name, photo are LOCKED
- ✅ Owner can only change: login, password, working hours
- ✅ Admin can change everything

---

## 🎯 Signal Types

### Places & Services:
- Pharmacy
- Optician/Eyewear
- Computer Repair
- Computer Store
- Shopping Center/Market
- Building Materials Store
- Construction Exchange
- Beauty/Hair Salon
- Massage
- Sauna
- Swimming Pool
- Gym
- Clothing Store
- Gift Shop
- Flower Shop
- GSM Repair
- Appliance Repair
- Appliance Store
- Bar
- Coffee/Sweets
- Fast Food
- Restaurant (Hi Class Food)

### Incidents:
- Accident
- Person Needing Help

---

## 📝 Required Fields

**ALL fields are REQUIRED except working hours:**

1. **Signal Type** (required)
   - Choose from dropdown

2. **Title** (required, max 100 chars)
   - Example: "Аптека Здраве", "Ресторант Черната дупка"

3. **Photo** (required)
   - MUST upload a photo
   - Auto-resized to max 1200x1200px, 80% quality
   - Accepted formats: JPEG, PNG, WebP

4. **Location** (required)
   - GPS coordinates (latitude, longitude)
   - Captured from current device location

5. **Working Hours** (optional, max 50 chars)
   - Example: "Денонощно", "09:00-18:00", "Почивен: Неделя"

---

## ⚠️ Validation Rules

### Backend Validation:
```javascript
// Required fields
if (!signal_type || !title || !latitude || !longitude) {
  return 400 error
}

// Photo is REQUIRED
if (!req.file) {
  return 400 error: "Photo is required"
}

// Title length
if (title.length > 100) {
  return 400 error
}

// Working hours length
if (working_hours && working_hours.length > 50) {
  return 400 error
}

// One per day limit
if (user.last_signal_date === today) {
  return 429 error: "You can only submit one signal per day"
}
```

### Frontend Validation (Web & Mobile):
```javascript
// Submit button is DISABLED until ALL required fields filled:
const isFormValid = signalType && title.trim() && photo && location;
```

---

## 🚀 User Flow

### Step 1: Check Eligibility
```
GET /api/signals/can-submit
Response: { canSubmit: true/false, message: "..." }
```

### Step 2: Fill Form
- Select signal type
- Enter title (max 100 chars)
- Enter working hours (optional, max 50 chars)
- Take/upload photo (REQUIRED)
- Capture GPS location (REQUIRED)

### Step 3: Submit
```
POST /api/signals/submit
Body: FormData {
  signal_type,
  title,
  working_hours,
  latitude,
  longitude,
  photo (file)
}
Response: { success: true, signalId: 123 }
```

### Step 4: Wait for Admin Review
- Signal status: 'pending'
- User sees in "My Signals" history

### Step 5: Get Notification (if approved)
- +1 free day added to account
- Static object created in database
- Appears in search results

---

## 👨‍💼 Admin Flow

### View Pending Signals
```
GET /api/signals/admin/pending
Response: {
  signals: [
    {
      id, user_id, signal_type, title, working_hours,
      latitude, longitude, photo_url,
      submitted_at, phone, full_name,
      hasDuplicatesNearby: true/false
    }
  ]
}
```

### Admin Actions:

#### 1. ✅ ОДОБРИ (Approve)
```
POST /api/signals/admin/approve/:signalId

What happens:
- Creates new user in database
- phone: "object_" + timestamp + random
- password: auto-generated
- full_name: title (first 50 chars)
- offerings: signal_type
- working_hours: from signal
- location: from signal (LOCKED)
- profile_photo_url: photo from signal
- is_static_object: 1
- paid_until: +100 years (no expiry)

Response: {
  success: true,
  staticObject: {
    id, login, password, name
  }
}

Submitter gets:
- +1 day added to paid_until
- free_days_earned +1
```

#### 2. 🗺️ КАРТА (Map)
Opens location in:
- Google Maps: `https://www.google.com/maps?q={lat},{lng}`
- Yandex Maps: `https://yandex.com/maps/?ll={lng},{lat}`
- 2GIS: `https://2gis.com/?m={lng},{lat}/16`

#### 3. 🗑️ НЕАКТУАЛЕН (Obsolete)
```
POST /api/signals/admin/obsolete/:signalId

What happens:
- Searches for matching static objects:
  * Same signal_type (offerings)
  * Within ~10m radius
  * is_static_object = 1

If found 1 object:
  - Deletes the object
  - Marks signal as rejected

If found 0 objects:
  - Returns message: "No matching objects"

If found >1 objects:
  - Returns IDs: [123, 456, 789]
  - Admin must manually delete from admin-static-objects page
```

#### 4. ❌ DUPLICATED (Reject)
```
POST /api/signals/admin/reject/:signalId
Body: { reason: "Duplicate" }

What happens:
- Signal status → 'rejected'
- User's last_signal_date → NULL (can submit again today)
- No objects deleted
```

---

## 🔍 Static Objects in Search

Static objects appear in **Search by Need** (Search #3):

```sql
SELECT * FROM users
WHERE offerings LIKE '%Pharmacy%'
  AND (paid_until > now OR is_static_object = 1)  -- Bypass payment
  AND (age >= 18 OR is_static_object = 1)         -- Bypass age
```

**Display includes:**
- Name (from title)
- Photo (from signal)
- Working hours
- Location (map marker)
- Offerings (signal type)

---

## 🔒 Static Object Permissions

### Owner Can Change:
- ✅ Login (phone)
- ✅ Password
- ✅ Working hours

### Owner CANNOT Change:
- ❌ Name (full_name)
- ❌ Location (latitude, longitude)
- ❌ Photo (profile_photo_url)
- ❌ Offerings

### Admin Can Change:
- ✅ EVERYTHING (including locked fields)

Implementation:
```javascript
// In routes/profile.js
if (user.is_static_object) {
  if (working_hours !== undefined) {
    // Allow only working_hours update
  } else {
    return 403: "Contact admin to change other fields"
  }
}
```

---

## 📊 Database Schema

### users table (new fields):
```sql
is_static_object INTEGER DEFAULT 0,
created_from_signal_id INTEGER,
profile_photo_url TEXT,
working_hours TEXT CHECK(length(working_hours) <= 50),
last_signal_date TEXT,
free_days_earned INTEGER DEFAULT 0,
```

### signals table:
```sql
CREATE TABLE signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  signal_type TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(title) <= 100),
  working_hours TEXT CHECK(length(working_hours) <= 50),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT,
  processed_by_admin_id INTEGER,
  created_user_id INTEGER,
  rejection_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (processed_by_admin_id) REFERENCES users(id),
  FOREIGN KEY (created_user_id) REFERENCES users(id)
);
```

---

## 🧪 Testing

See `tests/signals-features.test.js` for:
- Signal submission tests
- Validation tests
- Admin approval tests
- Static object tests
- Search integration tests

Run tests:
```bash
cd tests
npm test signals-features.test.js
```

---

## 📱 Frontend Pages

### Web:
- `public/signal.html` - Submit signal
- `public/admin-signals.html` - Review signals (admin)
- `public/admin-static-objects.html` - Manage users/objects (admin)

### Mobile:
- `src/screens/SignalScreen.js` - Submit signal

---

## 🔐 Security Notes

1. **Photo Upload:**
   - Max 5MB file size
   - Only JPEG, PNG, WebP allowed
   - Auto-resized to prevent large files

2. **Rate Limiting:**
   - 1 signal per user per day
   - Enforced at database level (last_signal_date)

3. **Admin Only:**
   - All admin endpoints check `manually_activated = 1`
   - Approval, rejection, deletion require admin auth

4. **Static Object Protection:**
   - Location, name, photo locked for owners
   - Only admin can modify these fields

---

## ❓ FAQ

**Q: Can I submit multiple signals per day?**
A: No. Only 1 signal per day per user.

**Q: What happens if my signal is rejected?**
A: You can submit another signal immediately (same day).

**Q: Do I need to pay for a static object account?**
A: No. Static objects bypass all payment checks.

**Q: Can I change the location of my static object?**
A: No. Only admin can change location, name, or photo. You can only change working hours.

**Q: How long does approval take?**
A: Depends on admin availability. Check "My Signals" page for status.

**Q: Can I delete my submitted signal?**
A: No. Only admin can approve/reject. Contact admin if needed.

---

**Version:** 00025  
**Last Updated:** 2026-01-30  
**Status:** Production Ready ✅
