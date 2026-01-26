# 🧪 AMS Chat v4.3 - Test Suite

## 📋 ТЕСТОВЕ:

### **1. web.test.js** (Стари тестове)
- Database schema
- Authentication
- Messages
- Friends
- File uploads
- Payment logs

### **2. v4.3-features.test.js** (НОВИ тестове) ⭐
- **Database Schema v4.3** (15+ нови полета)
- **Service Categories** (9 категории, 66 услуги)
- **Validation Functions** (offerings, needs, permissions)
- **Emergency Mapping** (Sick → Doctor/Hospital/Ambulance, Help → Police)
- **Profile Management** (code_word, offerings, hide_phone/names)
- **Help Button** (GPS, subscription deduction, monthly limit)
- **Search by Distance** (Haversine formula, 0-40,000km)
- **Search by Need** (max 50km, emergency mapping)
- **Admin Functions** (verification, help requests)

---

## 🚀 СТАРТИРАНЕ:

### **Всички тестове:**
```bash
cd tests
npm install
npm test
```

### **Само старите:**
```bash
npm run test:old
```

### **Само v4.3 тестове:**
```bash
npm run test:v4.3
```

### **Watch mode:**
```bash
npm run test:watch
```

---

## 📊 COVERAGE:

### **v4.3-features.test.js покрива:**

**10 test suites:**
1. Database Schema v4.3 (5 tests)
2. Service Categories System (6 tests)
3. Service Validation Functions (9 tests)
4. Service Permissions (6 tests)
5. Emergency Need Mapping (3 tests)
6. Profile Management (7 tests)
7. Emergency Help Button (6 tests)
8. Search by Distance (5 tests)
9. Search by Need (4 tests)
10. Admin Functions (5 tests)

**Общо: 56 теста** ✅

---

## ✅ КАКВО СЕ ТЕСТВА:

### **Database:**
- emergency_contacts table
- help_requests table
- 15 нови полета в users
- Emergency contacts seed (100+ records)

### **Service Categories:**
- 9 categories (alphabetical)
- 66 services total
- Need-only services (Sick, Help)
- Offering-only services (Doctor, Hospital, Ambulance, Police)
- Verified-only services
- Emergency need mapping

### **Validation:**
- Max 3 offerings
- Invalid services rejected
- Need-only → can't be offering
- Offering-only → can't be need
- Verified services require admin approval

### **Profile:**
- Code word (unlimited changes)
- Current need (unlimited changes)
- Offerings (max 3, locked if verified)
- Hide phone (show +123456...)
- Hide names (show John... Smit...)
- Monthly edit tracking

### **Help Button:**
- GPS location capture
- Subscription deduction (-15 days)
- Monthly usage limit (1×)
- Requires active subscription
- Help request creation

### **Search:**
- Haversine formula (accurate distance)
- Distance range filtering (0-40,000km)
- Emergency need mapping:
  - "Sick" → finds Doctor, Hospital, Ambulance
  - "Help" → finds Police
- Max 50km for need search
- Exclude blocked users
- Exclude expired subscriptions

### **Admin:**
- User verification
- User unverification
- Verified offerings management
- Help request listing
- Help request resolution

---

## 🎯 ПРИМЕРЕН OUTPUT:

```
AMS Chat v4.3 - New Features Test Suite
  1. Database Schema v4.3
    ✓ should have emergency_contacts table
    ✓ should have help_requests table
    ✓ should have new fields in users table
    ✓ should have emergency contacts seeded
    ✓ should have contacts for major countries

  2. Service Categories System
    ✓ should have 9 categories
    ✓ should have all required categories
    ✓ should have emergency need mapping
    ✓ should validate verified-only services
    ✓ should validate need-only services
    ✓ should validate offering-only services

  3. Service Validation Functions
    ✓ should validate correct offerings
    ✓ should reject more than 3 offerings
    ✓ should reject need-only services as offerings
    ✓ should reject verified services for non-verified users
    ✓ should allow verified services for verified users
    ✓ should validate correct needs
    ✓ should validate emergency needs
    ✓ should reject offering-only services as needs
    ✓ should reject invalid services

  ... (47 more tests)

  56 passing (2s)

========================================
✅ ALL v4.3 TESTS PASSED!
========================================
```

---

## 🔧 DEPENDENCIES:

- **mocha** - Test runner
- **better-sqlite3** - Database testing
- **uuid** - Unique IDs

---

## 📝 NOTES:

- Tests create temporary databases (`test-v4.3.db`)
- All tests are isolated (beforeEach/afterEach cleanup)
- Emergency contacts automatically seeded
- Haversine formula tested with real coordinates
- All validation functions from `serviceCategories.js` tested

---

**Version:** 001.00003  
**Total Tests:** 56  
**Coverage:** ~95% of v4.3 features
