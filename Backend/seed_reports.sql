-- Seed Reports Database
-- Connect to kashif_reports database

-- Insert Categories  
INSERT INTO categories (name, description) VALUES
('Infrastructure', 'Roads, bridges, public facilities'),
('Environment', 'Pollution, waste management'),
('Safety', 'Public safety concerns')
ON CONFLICT DO NOTHING;

-- Insert Statuses
INSERT INTO report_statuses (name, description) VALUES
('NEW', 'New report'),
('IN_PROGRESS', 'Being handled'),
('RESOLVED', 'Issue resolved'),
('REJECTED', 'Report rejected')
ON CONFLICT DO NOTHING;

-- Insert Severities
INSERT INTO severities (name, description, category_id) VALUES
('LOW', 'Low priority', 1),
('MEDIUM', 'Medium priority', 1),
('HIGH', 'High priority', 1),
('LOW', 'Low priority', 2),
('MEDIUM', 'Medium priority', 2),
('HIGH', 'High priority', 2),
('LOW', 'Low priority', 3),
('MEDIUM', 'Medium priority', 3),
('HIGH', 'High priority', 3)
ON CONFLICT DO NOTHING;

-- Insert Sample Reports
INSERT INTO reports (user_id, category_id, status_id, severity_id, title, description, latitude, longitude, created_at) VALUES
(1, 1, 1, 2, 'Pothole on Main Street', 'Large pothole needs immediate repair', 24.7136, 46.6753, NOW() - INTERVAL '5 days'),
(2, 1, 2, 3, 'Broken Street Light', 'Street light not working at intersection', 24.7256, 46.6853, NOW() - INTERVAL '3 days'),
(1, 2, 1, 2, 'Illegal Dumping', 'Garbage dumped illegally near park', 24.7036, 46.6653, NOW() - INTERVAL '7 days'),
(3, 2, 3, 1, 'Park Cleanup', 'Park cleaned successfully', 24.7336, 46.6953, NOW() - INTERVAL '10 days'),
(2, 3, 1, 3, 'Broken Playground Equipment', 'Swing set damaged and unsafe', 24.7436, 46.7053, NOW() - INTERVAL '2 days'),
(1, 3, 2, 2, 'Missing Stop Sign', 'Stop sign fallen down', 24.7536, 46.7153, NOW() - INTERVAL '4 days'),
(3, 1, 1, 2, 'Sidewalk Crack', 'Trip hazard on sidewalk', 24.7636, 46.7253, NOW() - INTERVAL '6 days'),
(2, 2, 3, 1, 'Tree Trimming Needed', 'Overgrown trees blocking view', 24.7736, 46.7353, NOW() - INTERVAL '8 days'),
(1, 3, 2, 3, 'Speeding Vehicles', 'Cars speeding in residential area', 24.7836, 46.7453, NOW() - INTERVAL '1 day'),
(3, 1, 1, 2, 'Water Leak', 'Water leaking on sidewalk', 24.7936, 46.7553, NOW());
