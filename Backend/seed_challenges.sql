-- Seed Weekly Challenges
-- Run inside kashif-gamification-db container

-- Create tables if not exists (SQLAlchemy creates them, but just in case)
CREATE TABLE IF NOT EXISTS weekly_challenges (
    id SERIAL PRIMARY KEY,
    title_en VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200) NOT NULL,
    title_ku VARCHAR(200),
    description_en VARCHAR(500),
    description_ar VARCHAR(500),
    description_ku VARCHAR(500),
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
INSERT INTO weekly_challenges (title_en, title_ar, title_ku, description_en, description_ar, description_ku, icon, condition_type, target_value, bonus_points, week_start, week_end, is_active)
VALUES
  ('Road Warrior', 'محارب الطرق', 'Şervanê Rê', 'Report 5 road issues this week', 'أبلغ عن 5 مشاكل في الطرق هذا الأسبوع', 'Vê hefteyê 5 pirsgirêkên rê ragihîne', '🛣️', 'report_count', 5, 100, date_trunc('week', NOW()), date_trunc('week', NOW()) + interval '6 days 23 hours 59 minutes', true),
  ('Watchful Eye', 'العين الساهرة', 'Çavê Hişyar', 'Confirm 3 reports this week', 'أكّد 3 بلاغات هذا الأسبوع', 'Vê hefteyê 3 raporan piştrast bike', '👁️', 'confirm_count', 3, 75, date_trunc('week', NOW()), date_trunc('week', NOW()) + interval '6 days 23 hours 59 minutes', true),
  ('Point Collector', 'جامع النقاط', 'Berhevkarê Xalan', 'Earn 200 points this week', 'اجمع 200 نقطة هذا الأسبوع', 'Vê hefteyê 200 xalan bi dest bixe', '💎', 'points_earned', 200, 150, date_trunc('week', NOW()), date_trunc('week', NOW()) + interval '6 days 23 hours 59 minutes', true),
  ('Quick Reporter', 'المُبلّغ السريع', 'Ragihanê Bilez', 'Report 3 issues this week', 'أبلغ عن 3 مشاكل هذا الأسبوع', 'Vê hefteyê 3 pirsgirêkan ragihîne', '⚡', 'report_count', 3, 50, date_trunc('week', NOW()), date_trunc('week', NOW()) + interval '6 days 23 hours 59 minutes', true);

-- Also add next week challenges
INSERT INTO weekly_challenges (title_en, title_ar, title_ku, description_en, description_ar, description_ku, icon, condition_type, target_value, bonus_points, week_start, week_end, is_active)
VALUES
  ('Super Spotter', 'الراصد الخارق', 'Çavdêrê Mezin', 'Report 10 road issues', 'أبلغ عن 10 مشاكل في الطرق', '10 pirsgirêkên rê ragihîne', '🦸', 'report_count', 10, 200, date_trunc('week', NOW()) + interval '7 days', date_trunc('week', NOW()) + interval '13 days 23 hours 59 minutes', true),
  ('Verification Master', 'بطل التحقق', 'Mamosteyê Piştrastkirinê', 'Confirm 5 reports', 'أكّد 5 بلاغات', '5 raporan piştrast bike', '✅', 'confirm_count', 5, 100, date_trunc('week', NOW()) + interval '7 days', date_trunc('week', NOW()) + interval '13 days 23 hours 59 minutes', true),
  ('Points Champion', 'بطل النقاط', 'Şampiyonê Xalan', 'Earn 500 points', 'اجمع 500 نقطة', '500 xalan bi dest bixe', '🏅', 'points_earned', 500, 250, date_trunc('week', NOW()) + interval '7 days', date_trunc('week', NOW()) + interval '13 days 23 hours 59 minutes', true);
