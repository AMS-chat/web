<!-- Version: 001.00001 -->
# AMS Chat Web App - Test Suite

## 📋 Описание

Пълен test suite за AMS Chat Web приложението, който покрива всички критични функционалности включително специфичните за web:

- ✅ Database операции
- ✅ Web-specific файлове (HTML, PWA)
- ✅ Crypto payment integration
- ✅ Crypto payment listener
- ✅ WebSocket sessions
- ✅ Admin panel functionality
- ✅ File management
- ✅ Message size limits
- ✅ Search/Discovery

## 🚀 Как да стартирам тестовете

### Предварителни изисквания

Имаш инсталиран глобално **Node.js** (v14 или по-нова версия).

### Стъпка 1: Инсталирай dependencies

```bash
cd tests
npm install
```

Това ще инсталира:
- `mocha` - Test runner
- `chai` - Assertion library
- `better-sqlite3` - SQLite database
- `uuid` - UUID generator

### Стъпка 2: Стартирай тестовете

```bash
npm test
```

Или за continuous watching:

```bash
npm run test:watch
```

## 📊 Какво се тества

### 1. Database Tests
- Създаване на всички таблици
- SQLite schema validation

### 2. Web-Specific Tests
- HTML файлове (index.html, chat.html, payment.html, admin.html)
- config.js existence
- PWA files (manifest.json, sw.js, icons)

### 3. Crypto Payment Tests
- KCY token payment recording
- Transaction hash validation
- Double-spend prevention
- User subscription update
- Payment status checking

### 4. Crypto Listener Tests
- crypto-payment-listener.js existence
- Pending payment logging
- Wallet address handling

### 5. Session Management Tests
- Web session creation
- Session token format validation
- Session expiration

### 6. WebSocket Tests
- Session validation for WS connections
- User phone retrieval
- Connection authentication

### 7. Admin Panel Tests
- User listing
- Block/Unblock functionality
- Flagged conversations retrieval
- Payment logs retrieval

### 8. File Management Tests
- Temp file entry creation
- Auto-delete after download
- Download tracking

### 9. Message Size Tests
- 5KB history limit enforcement
- Message size calculation
- Old message cleanup simulation

### 10. Search Discovery Tests
- Demographic search
- Blocked user exclusion
- Unpaid user exclusion

## 📁 Структура

```
tests/
├── web.test.js       # Main test file
├── package.json      # Test dependencies
├── test.db          # Temporary test database (auto-created/deleted)
└── README.md        # This file
```

## ⚙️ Test Database

Тестовете създават временна SQLite database (`test.db`), която:
- Се създава преди всеки test run
- Използва същата schema като production database
- Се изтрива автоматично след приключване на тестовете

## 🎯 Expected Output

При успешно стартиране ще видиш:

```
  AMS Chat Web App - Test Suite
    Database Tests
      ✓ should create all required tables
    Web-Specific Tests
      ✓ should validate HTML files exist
      ✓ should validate config.js exists
      ✓ should validate PWA files exist
    Crypto Payment Tests
      ✓ should record crypto payment
      ✓ should prevent duplicate transaction hash
      ✓ should update user paid_until after crypto payment
    Crypto Listener Tests
      ✓ should validate crypto-payment-listener.js exists
      ✓ should log pending crypto payment
    Session Management Tests
      ✓ should create web session
      ✓ should validate session token format
    WebSocket Tests
      ✓ should validate session for WebSocket connection
    Admin Panel Tests
      ✓ should retrieve all users for admin
      ✓ should block/unblock user
      ✓ should retrieve flagged conversations
      ✓ should retrieve payment logs
    File Management Tests
      ✓ should create temp file entry
      ✓ should auto-delete after download
    Message Size Tests
      ✓ should enforce 5KB message history limit
    Search Discovery Tests
      ✓ should search by demographics
      ✓ should exclude blocked users from search
      ✓ should exclude unpaid users from search

  ✅ All web app tests completed successfully!

  XX passing (XXXms)
```

## 🌐 Web-Specific Features Tested

### PWA (Progressive Web App)
- manifest.json validation
- Service Worker (sw.js) presence
- Icon files (192x192, 512x512)

### Crypto Payment
- MetaMask browser integration ready
- KCY1 token payment flow
- Automatic payment listener support

### Admin Panel
- User management
- Payment tracking
- Content moderation

## 🔧 Troubleshooting

### Test database не се изтрива?
Проверете дали нямате отворени connections към `test.db`. Тестовете автоматично затварят database connection след приключване.

### "Module not found" грешки?
```bash
cd tests
npm install
```

### HTML файлове не се намират?
Уверете се, че стартирате тестовете от `tests/` директорията и че `public/` директорията съществува на правилното място.

### Тестовете падат?
1. Провери дали `../db_setup.sql` съществува
2. Провери дали `../public/` директорията съществува
3. Провери дали `../crypto-payment-listener.js` съществува
4. Виж конкретната грешка в console output

## 📝 Добавяне на нови тестове

За да добавиш нов test:

```javascript
describe('Your Test Category', () => {
  it('should do something', () => {
    // Your test code
    const result = someFunction();
    assert.strictEqual(result, expectedValue, 'Error message');
  });
});
```

## 🎓 Best Practices

1. **Isolation**: Всеки тест е независим
2. **Cleanup**: Database се рестартира за всеки test run
3. **Assertions**: Използвай descriptive error messages
4. **Timeout**: Default timeout е 10000ms (10 секунди)
5. **File checks**: Проверяваме existence на критични файлове

## 🔐 Security Tests

Тестовете включват проверки за:
- Session token security (hex format, length)
- Duplicate transaction prevention
- User blocking functionality
- Payment validation

## 📖 Документация

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertion Library](https://www.chaijs.com/)
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

## 🚀 Deployment Testing

Преди deployment, провери:
1. Всички тестове минават успешно
2. `public/config.js` има правилен TOKEN_ADDRESS
3. PWA файловете са налични
4. HTML файловете са валидни

---

*Version: 001.00001*
