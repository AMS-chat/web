CREATE DATABASE kcychat;

\c kcychat;

CREATE TABLE users (
  phone VARCHAR(20) PRIMARY KEY,
  paid_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE friends (
  phone1 VARCHAR(20) NOT NULL,
  phone2 VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (phone1, phone2),
  CHECK (phone1 < phone2)
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  from_phone VARCHAR(20) NOT NULL,
  to_phone VARCHAR(20) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_paid ON users(paid_until);
CREATE INDEX idx_messages_from_to ON messages(from_phone, to_phone, created_at DESC);
CREATE INDEX idx_messages_to_from ON messages(to_phone, from_phone, created_at DESC);
CREATE INDEX idx_friends_phone1 ON friends(phone1);
CREATE INDEX idx_friends_phone2 ON friends(phone2);

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