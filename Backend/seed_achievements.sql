-- Seed Achievements for Gamification Service
-- Run on gamification DB: kashif_gamification

-- Create tables if they don't exist (SQLAlchemy should handle this, but just in case)
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_ku VARCHAR(100),
    description_en TEXT,
    description_ar TEXT,
    description_ku TEXT,
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
INSERT INTO achievements (key, name_en, name_ar, name_ku, description_en, description_ar, description_ku, icon, category, condition_type, condition_value, points_reward)
VALUES
    ('first_report', 'First Report', 'أول بلاغ', 'Rapora Yekem', 'Submit your very first road hazard report', 'قدم أول بلاغ عن مخاطر الطريق', 'Rapora xwe ya yekem a metirsiya rê bişîne', '🌟', 'reporting', 'report_count', 1, 10),
    ('report_5', '5 Reports', '٥ بلاغات', '5 Rapor', 'Submit 5 road hazard reports', 'قدم ٥ بلاغات عن مخاطر الطريق', '5 raporên metirsiya rê bişîne', '📝', 'reporting', 'report_count', 5, 20),
    ('report_10', 'Road Watcher', 'مراقب الطريق', 'Çavdêrê Rê', 'Submit 10 road hazard reports', 'قدم ١٠ بلاغات عن مخاطر الطريق', '10 raporên metirsiya rê bişîne', '👁️', 'reporting', 'report_count', 10, 50),
    ('report_25', 'Road Guardian', 'حارس الطريق', 'Parêzvanê Rê', 'Submit 25 road hazard reports', 'قدم ٢٥ بلاغاً عن مخاطر الطريق', '25 raporên metirsiya rê bişîne', '🛡️', 'reporting', 'report_count', 25, 100),
    ('report_50', 'Road Hero', 'بطل الطريق', 'Qehremanê Rê', 'Submit 50 road hazard reports', 'قدم ٥٠ بلاغاً عن مخاطر الطريق', '50 raporên metirsiya rê bişîne', '🦸', 'reporting', 'report_count', 50, 200),
    ('report_100', 'Road Legend', 'أسطورة الطريق', 'Efsaneya Rê', 'Submit 100 road hazard reports', 'قدم ١٠٠ بلاغ عن مخاطر الطريق', '100 raporên metirsiya rê bişîne', '👑', 'reporting', 'report_count', 100, 500),
    ('confirm_1', 'First Confirmation', 'أول تأكيد', 'Piştrastkirina Yekem', 'Confirm your first report from another user', 'قم بتأكيد أول بلاغ من مستخدم آخر', 'Rapora yekem a bikarhênerekî din piştrast bike', '✅', 'confirming', 'confirm_count', 1, 5),
    ('confirm_10', 'Verifier', 'المحقق', 'Vekolîner', 'Confirm 10 reports from other users', 'قم بتأكيد ١٠ بلاغات من مستخدمين آخرين', '10 raporên bikarhênerên din piştrast bike', '🔍', 'confirming', 'confirm_count', 10, 50),
    ('confirm_50', 'Truth Seeker', 'باحث الحقيقة', 'Lêgerê Rastiyê', 'Confirm 50 reports from other users', 'قم بتأكيد ٥٠ بلاغاً من مستخدمين آخرين', '50 raporên bikarhênerên din piştrast bike', '🕵️', 'confirming', 'confirm_count', 50, 200),
    ('night_reporter', 'Night Reporter', 'مراسل الليل', 'Nûçegihanê Şevê', 'Submit a report between 10 PM and 6 AM', 'قدم بلاغاً بين الساعة العاشرة مساءً والسادسة صباحاً', 'Di navbera 10ê şevê û 6ê sibehê de raporek bişîne', '🌙', 'general', 'night_report', 1, 15),
    ('night_owl', 'Night Owl', 'بومة الليل', 'Kundê Şevê', 'Submit 10 reports between 10 PM and 6 AM', 'قدم ١٠ بلاغات بين الساعة العاشرة مساءً والسادسة صباحاً', 'Di navbera 10ê şevê û 6ê sibehê de 10 rapor bişîne', '🦉', 'general', 'night_report', 10, 100),
    ('pothole_hunter', 'Pothole Hunter', 'صياد الحفر', 'Nêçîrvanê Çalan', 'Report 10 potholes', 'أبلغ عن ١٠ حفر في الطريق', '10 çalan ragihîne', '🕳️', 'reporting', 'pothole_count', 10, 50),
    ('pothole_master', 'Pothole Master', 'خبير الحفر', 'Pisporê Çalan', 'Report 50 potholes', 'أبلغ عن ٥٠ حفرة في الطريق', '50 çalan ragihîne', '🏗️', 'reporting', 'pothole_count', 50, 200),
    ('points_100', 'Point Collector', 'جامع النقاط', 'Berhevkarê Xalan', 'Accumulate 100 total points', 'اجمع ١٠٠ نقطة', '100 xalan berhev bike', '💯', 'general', 'points_total', 100, 0),
    ('points_500', 'Points Pro', 'محترف النقاط', 'Profesyonelê Xalan', 'Accumulate 500 total points', 'اجمع ٥٠٠ نقطة', '500 xalan berhev bike', '🎯', 'general', 'points_total', 500, 0),
    ('points_1000', 'Points Master', 'سيد النقاط', 'Mamosteyê Xalan', 'Accumulate 1000 total points', 'اجمع ١٠٠٠ نقطة', '1000 xalan berhev bike', '💎', 'general', 'points_total', 1000, 0)
<<<<<<< HEAD
ON CONFLICT (key) DO NOTHING;
=======
ON CONFLICT (key) DO UPDATE SET
    name_ku = EXCLUDED.name_ku,
    description_ku = EXCLUDED.description_ku;
>>>>>>> feature/Ku_feature
