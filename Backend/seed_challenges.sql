-- Seed Weekly Challenges
-- Run inside kashif-gamification-db container

-- Create tables if not exists (SQLAlchemy creates them, but just in case)
CREATE TABLE IF NOT EXISTS weekly_challenges (
    id SERIAL PRIMARY KEY,
    title_en VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200) NOT NULL,
    description_en VARCHAR(500),
    description_ar VARCHAR(500),
    icon VARCHAR(10) DEFAULT '🎯',
    condition_type VARCHAR(50) NOT NULL,
    target_value INTEGER NOT NULL DEFAULT 1,
    bonus_points INTEGER NOT NULL DEFAULT 50,
    week_start TIMESTAMP NOT NULL,
    week_end TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL REFERENCES weekly_challenges(id),
    current_value INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Insert current-week challenges (Monday to Sunday)
-- Adjust dates for current week
INSERT INTO weekly_challenges (title_en, title_ar, description_en, description_ar, icon, condition_type, target_value, bonus_points, week_start, week_end, is_active)
VALUES
  ('Road Warrior', 'محارب الطرق', 'Report 5 road issues this week', 'أبلغ عن 5 مشاكل في الطرق هذا الأسبوع', '🛣️', 'report_count', 5, 100, date_trunc('week', NOW()), date_trunc('week', NOW()) + interval '6 days 23 hours 59 minutes', true),
  ('Watchful Eye', 'العين الساهرة', 'Confirm 3 reports this week', 'أكّد 3 بلاغات هذا الأسبوع', '👁️', 'confirm_count', 3, 75, date_trunc('week', NOW()), date_trunc('week', NOW()) + interval '6 days 23 hours 59 minutes', true),
  ('Point Collector', 'جامع النقاط', 'Earn 200 points this week', 'اجمع 200 نقطة هذا الأسبوع', '💎', 'points_earned', 200, 150, date_trunc('week', NOW()), date_trunc('week', NOW()) + interval '6 days 23 hours 59 minutes', true),
  ('Quick Reporter', 'المُبلّغ السريع', 'Report 3 issues this week', 'أبلغ عن 3 مشاكل هذا الأسبوع', '⚡', 'report_count', 3, 50, date_trunc('week', NOW()), date_trunc('week', NOW()) + interval '6 days 23 hours 59 minutes', true);

-- Also add next week challenges
INSERT INTO weekly_challenges (title_en, title_ar, description_en, description_ar, icon, condition_type, target_value, bonus_points, week_start, week_end, is_active)
VALUES
  ('Super Spotter', 'الراصد الخارق', 'Report 10 road issues', 'أبلغ عن 10 مشاكل في الطرق', '🦸', 'report_count', 10, 200, date_trunc('week', NOW()) + interval '7 days', date_trunc('week', NOW()) + interval '13 days 23 hours 59 minutes', true),
  ('Verification Master', 'بطل التحقق', 'Confirm 5 reports', 'أكّد 5 بلاغات', '✅', 'confirm_count', 5, 100, date_trunc('week', NOW()) + interval '7 days', date_trunc('week', NOW()) + interval '13 days 23 hours 59 minutes', true),
  ('Points Champion', 'بطل النقاط', 'Earn 500 points', 'اجمع 500 نقطة', '🏅', 'points_earned', 500, 250, date_trunc('week', NOW()) + interval '7 days', date_trunc('week', NOW()) + interval '13 days 23 hours 59 minutes', true);
