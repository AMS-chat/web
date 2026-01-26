# CHANGELOG - AMS Chat System

## Version 001.00002 (January 2026) - Development

### 🆕 NEW FEATURES

#### **Enhanced Profile Management**
- Added `code_word` field for exact user search
- Added `current_need` field (unlimited changes)
- Added `offerings` field (max 3 services, unlimited changes for non-verified)
- Added `is_verified` flag - locks offerings for verified users
- Added `email` field
- Added `birth_date` field
- Added privacy controls: `hide_phone` and `hide_names`
- Profile edit tracking (1 edit/month for basic info)

#### **Service Categories System**
- 5 main categories: Emergency, Craftsman, Translator, Food/Drink, Social
- 40+ subcategories
- Public vs Verified-only services
- Emergency services (Doctor, Hospital, Ambulance, Police) require admin verification

#### **Emergency Help Button**
- SOS button sends GPS coordinates to admin
- Cost: 10× subscription fee (€50 or $50)
- Deducts 15 days from subscription
- Limit: 1 use per month
- Requires active subscription

#### **Advanced Search**
- **Search #2:** By distance (0-40,000km radius)
  - Filters: age, gender, height
  - Haversine distance formula
  - Results sorted by proximity
  
- **Search #3:** By need (max 50km radius, fixed)
  - Matches user needs with provider offerings
  - Filters: age, gender, height, city
  - Shows verified users for emergency services

#### **Emergency Contacts Database**
- Pre-loaded for 20+ countries
- Includes international phone numbers for:
  - Police
  - Ambulance  
  - Fire Department
  - Unified Emergency Number (112)
- Auto-loads on first server start

#### **Admin Panel Enhancements**
- "Help Requests" dashboard
- Nearby services finder (50km radius)
- User verification system
- Verified profile management
- Emergency response coordination

### 📊 DATABASE CHANGES

#### **users table - New Fields:**
```sql
code_word TEXT
current_need TEXT  
offerings TEXT
is_verified INTEGER DEFAULT 0
email TEXT
birth_date TEXT
hide_phone INTEGER DEFAULT 0
hide_names INTEGER DEFAULT 0
last_profile_update TEXT
profile_edits_this_month INTEGER DEFAULT 0
profile_edit_reset_date TEXT
help_button_uses INTEGER DEFAULT 0
help_button_reset_date TEXT
```

#### **New Tables:**

**emergency_contacts:**
- Stores emergency phone numbers by country
- 100+ pre-loaded contacts for 20+ countries

**help_requests:**
- Tracks emergency help button usage
- Stores GPS coordinates and user info
- Admin resolution tracking

### 🔌 API ENDPOINTS

#### **Profile API** (`/api/profile`)
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update basic info (1×/month)
- `PUT /api/profile/password` - Change password (unlimited)
- `PUT /api/profile/code-word` - Update code word (unlimited)
- `PUT /api/profile/need` - Update current need (unlimited)
- `PUT /api/profile/offerings` - Update offerings (locked for verified)
- `PUT /api/profile/email` - Update email (unlimited)
- `PUT /api/profile/hide-phone` - Toggle phone visibility
- `PUT /api/profile/hide-names` - Toggle name visibility
- `GET /api/profile/service-categories` - Get dropdown options

#### **Help API** (`/api/help`)
- `POST /api/help/emergency` - Send SOS with GPS
- `GET /api/help/emergency-contacts` - Get country contacts
- `GET /api/help/availability` - Check button availability

#### **Search API** (`/api/search`)
- `POST /api/search/by-distance` - Distance-based search
- `POST /api/search/by-need` - Need-based search

#### **Admin API** (`/api/admin`)
- `GET /api/admin/help-requests` - List help requests
- `GET /api/admin/help-requests/:id/nearby-services` - Find nearby help
- `PUT /api/admin/help-requests/:id/resolve` - Mark as resolved
- `PUT /api/admin/users/:id/verify` - Verify user & lock offerings
- `PUT /api/admin/users/:id/unverify` - Remove verification
- `PUT /api/admin/users/:id/offerings` - Admin edit offerings

### 🎨 FRONTEND UPDATES

#### **Web App:**
- New `profile.html` - Complete settings page
- Updated `index.html` - Added "How it works" modal
- Updated `chat.html` - Added profile & logout buttons
- Service category dropdowns
- Emergency help button UI
- Subscription status display

#### **Mobile App:**
- Backend API ready
- Frontend screens to be added in next version

### 📝 IMPORTANT RULES

**Profile Editing:**
- Name, phone, birth_date, city: **1 edit/month**
- Password, code_word, need, offerings, email: **unlimited**

**Offerings Field:**
- Non-verified users: Can change freely (public services only)
- Verified users: **LOCKED** - only admin can modify
- Max 3 services

**Help Button:**
- Requires active subscription
- 1 use per month
- Deducts half month (15 days)

**Search Restrictions:**
- Users under 18: NOT shown in searches
- Exception: Exact search with full data + code word

### 🌍 SUPPORTED COUNTRIES (Emergency Contacts)

Bulgaria, Russia, Lithuania, Latvia, Estonia, Kyrgyzstan, USA, UK, Germany, France, Spain, Italy, Poland, Greece, Turkey, Ukraine, Czech Republic, Romania, Serbia

### 🔧 TECHNICAL IMPROVEMENTS

- Haversine distance calculation for geo-search
- Monthly reset logic for profile edits and help button
- Service category validation system
- Emergency contacts auto-loading
- Verified user management system

### 📚 DOCUMENTATION

- `API_DOCUMENTATION_v4.3.md` - Complete API reference
- `STRIPE_PAYMENT_GUIDE.md` - Payment integration guide
- `emergency_contacts_seed.sql` - Emergency contacts data

---

## Version 001.00001 (Initial Release)

### Core Features
- User authentication with phone + password
- Friend system
- Real-time messaging (WebSocket)
- File sharing (100MB max)
- Message history (5KB limit)
- Payment integration (Stripe + Crypto)
- Admin panel
- Content moderation
- Location sharing
- Critical words filtering

### Database
- SQLite with WAL mode
- 10 core tables
- Indexes for performance

### Payment
- Stripe integration (€5/month EU, $5/month non-EU)
- Crypto payments (300 KCY tokens)
- Auto-detection of user country

---

**Development Status:** Pre-launch  
**Target Launch:** Version 001.00001 (when all features are production-ready)
