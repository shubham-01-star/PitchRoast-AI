-- PitchRoast AI Database Schema (MySQL)

-- Sessions table
CREATE TABLE IF NOT EXISTS call_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NULL,
  duration_ms INT,
  audio_url TEXT,
  transcript JSON,
  roast_report JSON,
  token_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_start_time (start_time DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usage tracking
CREATE TABLE IF NOT EXISTS daily_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  token_count INT DEFAULT 0,
  session_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usage_date (date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
