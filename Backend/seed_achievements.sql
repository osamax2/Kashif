-- Seed Achievements for Gamification Service
-- Run on gamification DB: kashif_gamification

-- Create tables if they don't exist (SQLAlchemy should handle this, but just in case)
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    icon VARCHAR(10) NOT NULL DEFAULT '🏆',
    category VARCHAR(30) NOT NULL DEFAULT 'general',
    condition_type VARCHAR(30) NOT NULL,
    condition_value INTEGER NOT NULL DEFAULT 1,
    points_reward INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id),
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Seed achievement definitions
INSERT INTO achievements (key, name_en, name_ar, description_en, description_ar, icon, category, condition_type, condition_value, points_reward)
VALUES
    ('first_report', 'First Report', 'أول بلاغ', 'Submit your very first road hazard report', 'قدم أول بلاغ عن مخاطر الطريق', '🌟', 'reporting', 'report_count', 1, 10),
    ('report_5', '5 Reports', '٥ بلاغات', 'Submit 5 road hazard reports', 'قدم ٥ بلاغات عن مخاطر الطريق', '📝', 'reporting', 'report_count', 5, 20),
    ('report_10', 'Road Watcher', 'مراقب الطريق', 'Submit 10 road hazard reports', 'قدم ١٠ بلاغات عن مخاطر الطريق', '👁️', 'reporting', 'report_count', 10, 50),
    ('report_25', 'Road Guardian', 'حارس الطريق', 'Submit 25 road hazard reports', 'قدم ٢٥ بلاغاً عن مخاطر الطريق', '🛡️', 'reporting', 'report_count', 25, 100),
    ('report_50', 'Road Hero', 'بطل الطريق', 'Submit 50 road hazard reports', 'قدم ٥٠ بلاغاً عن مخاطر الطريق', '🦸', 'reporting', 'report_count', 50, 200),
    ('report_100', 'Road Legend', 'أسطورة الطريق', 'Submit 100 road hazard reports', 'قدم ١٠٠ بلاغ عن مخاطر الطريق', '👑', 'reporting', 'report_count', 100, 500),
    ('confirm_1', 'First Confirmation', 'أول تأكيد', 'Confirm your first report from another user', 'قم بتأكيد أول بلاغ من مستخدم آخر', '✅', 'confirming', 'confirm_count', 1, 5),
    ('confirm_10', 'Verifier', 'المحقق', 'Confirm 10 reports from other users', 'قم بتأكيد ١٠ بلاغات من مستخدمين آخرين', '🔍', 'confirming', 'confirm_count', 10, 50),
    ('confirm_50', 'Truth Seeker', 'باحث الحقيقة', 'Confirm 50 reports from other users', 'قم بتأكيد ٥٠ بلاغاً من مستخدمين آخرين', '🕵️', 'confirming', 'confirm_count', 50, 200),
    ('night_reporter', 'Night Reporter', 'مراسل الليل', 'Submit a report between 10 PM and 6 AM', 'قدم بلاغاً بين الساعة العاشرة مساءً والسادسة صباحاً', '🌙', 'general', 'night_report', 1, 15),
    ('night_owl', 'Night Owl', 'بومة الليل', 'Submit 10 reports between 10 PM and 6 AM', 'قدم ١٠ بلاغات بين الساعة العاشرة مساءً والسادسة صباحاً', '🦉', 'general', 'night_report', 10, 100),
    ('pothole_hunter', 'Pothole Hunter', 'صياد الحفر', 'Report 10 potholes', 'أبلغ عن ١٠ حفر في الطريق', '🕳️', 'reporting', 'pothole_count', 10, 50),
    ('pothole_master', 'Pothole Master', 'خبير الحفر', 'Report 50 potholes', 'أبلغ عن ٥٠ حفرة في الطريق', '🏗️', 'reporting', 'pothole_count', 50, 200),
    ('points_100', 'Point Collector', 'جامع النقاط', 'Accumulate 100 total points', 'اجمع ١٠٠ نقطة', '💯', 'general', 'points_total', 100, 0),
    ('points_500', 'Points Pro', 'محترف النقاط', 'Accumulate 500 total points', 'اجمع ٥٠٠ نقطة', '🎯', 'general', 'points_total', 500, 0),
    ('points_1000', 'Points Master', 'سيد النقاط', 'Accumulate 1000 total points', 'اجمع ١٠٠٠ نقطة', '💎', 'general', 'points_total', 1000, 0)
ON CONFLICT (key) DO NOTHING;
