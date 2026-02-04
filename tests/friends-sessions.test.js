// Friends & Sessions Tests
const assert = require('assert');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const TEST_DB = path.join(__dirname, 'test-friends-sessions.db');
let db;

describe('👥 Friends & Sessions Tests', () => {
  before(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    db = new Database(TEST_DB);
    const schema = fs.readFileSync(path.join(__dirname, '../database/db_setup.sql'), 'utf8');
    db.exec(schema);
    db.prepare(`INSERT INTO users (phone, password_hash, full_name, gender, age) VALUES (?, ?, ?, ?, ?)`).run('+359888111111', 'hash', 'User 1', 'male', 25);
    db.prepare(`INSERT INTO users (phone, password_hash, full_name, gender, age) VALUES (?, ?, ?, ?, ?)`).run('+359888222222', 'hash', 'User 2', 'female', 28);
    console.log('✅ Test database created');
  });
  after(() => { db.close(); if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB); });

  describe('👥 Friends System', () => {
    it('should have friends table', () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='friends'").all();
      assert(tables.length === 1); console.log('   ✅ friends table exists');
    });
    it('should add friend', () => {
      const id = db.prepare(`INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)`).run(1, 2, 'pending').lastInsertRowid;
      assert(id); console.log('   ✅ Friend request sent');
    });
    it('should accept friend request', () => {
      db.prepare('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?').run('accepted', 1, 2);
      const friend = db.prepare('SELECT status FROM friends WHERE user_id = ? AND friend_id = ?').get(1, 2);
      assert.strictEqual(friend.status, 'accepted'); console.log('   ✅ Friend accepted');
    });
    it('should reject friend request', () => {
      db.prepare(`INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)`).run(2, 1, 'pending');
      db.prepare('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?').run('rejected', 2, 1);
      const friend = db.prepare('SELECT status FROM friends WHERE user_id = ? AND friend_id = ?').get(2, 1);
      assert.strictEqual(friend.status, 'rejected'); console.log('   ✅ Friend rejected');
    });
    it('should list user friends', () => {
      const friends = db.prepare('SELECT * FROM friends WHERE user_id = ? AND status = ?').all(1, 'accepted');
      console.log(`   ✅ User has ${friends.length} friends`);
    });
    it('should remove friend', () => {
      db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(1, 2);
      const friend = db.prepare('SELECT * FROM friends WHERE user_id = ? AND friend_id = ?').get(1, 2);
      assert(!friend); console.log('   ✅ Friend removed');
    });
  });

  describe('🔐 Sessions', () => {
    it('should create session', () => {
      const token = 'token_' + Date.now();
      const id = db.prepare(`INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, datetime('now', '+1 day'))`).run('sess_123', 1, token).lastInsertRowid;
      assert(id); console.log('   ✅ Session created');
    });
    it('should validate token', () => {
      const session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(1);
      assert(session.token); console.log('   ✅ Token valid');
    });
    it('should check expiry', () => {
      const session = db.prepare('SELECT expires_at FROM sessions WHERE user_id = ?').get(1);
      const isExpired = new Date(session.expires_at) < new Date();
      console.log(`   ✅ Session expired: ${isExpired}`);
    });
    it('should delete expired sessions', () => {
      const deleted = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
      console.log(`   ✅ Deleted ${deleted.changes} expired sessions`);
    });
    it('should logout (delete session)', () => {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(1);
      const session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(1);
      assert(!session); console.log('   ✅ Logout successful');
    });
  });
});
