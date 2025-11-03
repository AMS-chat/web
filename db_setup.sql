-- Create database
CREATE DATABASE amschat;

\c amschat;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  phone VARCHAR(20) PRIMARY KEY,
  paid_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Sessions table for authentication
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);

-- Friends table
CREATE TABLE friends (
  phone1 VARCHAR(20) NOT NULL,
  phone2 VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (phone1, phone2),
  CHECK (phone1 < phone2),
  FOREIGN KEY (phone1) REFERENCES users(phone) ON DELETE CASCADE,
  FOREIGN KEY (phone2) REFERENCES users(phone) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  from_phone VARCHAR(20) NOT NULL,
  to_phone VARCHAR(20) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  FOREIGN KEY (from_phone) REFERENCES users(phone) ON DELETE CASCADE,
  FOREIGN KEY (to_phone) REFERENCES users(phone) ON DELETE CASCADE
);

-- Payment logs table
CREATE TABLE payment_logs (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL,
  stripe_payment_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rate limiting table
CREATE TABLE rate_limits (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  UNIQUE(identifier, endpoint)
);

-- Indexes for performance
CREATE INDEX idx_users_paid ON users(paid_until) WHERE is_active = true;
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_phone ON sessions(phone);
CREATE INDEX idx_messages_from_to ON messages(from_phone, to_phone, created_at DESC);
CREATE INDEX idx_messages_to_from ON messages(to_phone, from_phone, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(to_phone, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_friends_phone1 ON friends(phone1);
CREATE INDEX idx_friends_phone2 ON friends(phone2);
CREATE INDEX idx_payment_logs_phone ON payment_logs(phone, created_at DESC);
CREATE INDEX idx_rate_limits_window ON rate_limits(identifier, endpoint, window_start);

-- Function to cleanup old messages (keep last 100 per conversation)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY 
                 CASE WHEN from_phone < to_phone 
                      THEN from_phone || '-' || to_phone 
                      ELSE to_phone || '-' || from_phone 
                 END
               ORDER BY created_at DESC
             ) as rn
      FROM messages
    ) sub
    WHERE rn > 100
  );
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to validate phone number format
CREATE OR REPLACE FUNCTION validate_phone(phone_number VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN phone_number ~ '^\+?[1-9]\d{7,14}$';
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate phone on insert/update
CREATE OR REPLACE FUNCTION check_phone_format()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone number format: %', NEW.phone;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_user_phone
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_phone_format();

-- Scheduled cleanup job hints (run via cron or pg_cron)
-- SELECT cleanup_old_messages(); -- Run daily
-- SELECT cleanup_expired_sessions(); -- Run hourly

COMMENT ON TABLE users IS 'Registered users with subscription status';
COMMENT ON TABLE sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE friends IS 'Friend connections between users';
COMMENT ON TABLE messages IS 'Chat messages between users';
COMMENT ON TABLE payment_logs IS 'Payment transaction history';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking';
