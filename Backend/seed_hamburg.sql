-- Insert 50 fake reports in Hamburg
INSERT INTO reports (user_id, title, description, category_id, status_id, latitude, longitude, address_text, severity_id, user_hide, confirmation_status, created_at, updated_at, points_awarded)
VALUES
-- Altstadt / City Center
(2, 'Schlagloch auf der Straße', 'Großes Schlagloch gefährdet den Verkehr - Altstadt', 1, 1, 53.5511, 9.9937, 'Altstadt, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '1 hour', NOW(), false),
(2, 'Defekte Straßenlaterne', 'Straßenlaterne funktioniert nicht - Rathaus', 1, 1, 53.5488, 9.9872, 'Rathaus, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '2 hours', NOW(), false),
(2, 'Radar-Blitzer', 'Geschwindigkeitskontrolle - Mönckebergstraße', 3, 1, 53.5503, 10.0006, 'Mönckebergstraße, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '30 minutes', NOW(), false),
-- St. Pauli / Reeperbahn
(2, 'Polizeikontrolle', 'Polizeikontrolle auf der Straße - Reeperbahn', 3, 1, 53.5495, 9.9632, 'Reeperbahn, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '45 minutes', NOW(), false),
(2, 'Illegale Müllentsorgung', 'Müll wurde illegal entsorgt - St. Pauli', 2, 1, 53.5514, 9.9589, 'St. Pauli, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '3 hours', NOW(), false),
(2, 'Verkehrsunfall', 'Unfall auf der Straße - Landungsbrücken', 3, 1, 53.5478, 9.9545, 'Landungsbrücken, Hamburg', 5, false, 'confirmed', NOW() - INTERVAL '15 minutes', NOW(), false),
-- HafenCity
(2, 'Wasserleck', 'Wasser tritt aus dem Boden - HafenCity', 4, 1, 53.5411, 9.9988, 'HafenCity, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '1 hour', NOW(), false),
(2, 'Baustelle auf der Straße', 'Straßenarbeiten - Elbphilharmonie', 3, 1, 53.5395, 10.0052, 'Elbphilharmonie, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '4 hours', NOW(), false),
(2, 'Umgestürzter Baum', 'Baum blockiert den Weg - Speicherstadt', 2, 1, 53.5367, 10.0089, 'Speicherstadt, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '6 hours', NOW(), false),
-- Eppendorf / Winterhude
(2, 'Beschädigter Bürgersteig', 'Gehweg ist beschädigt - Eppendorf', 1, 1, 53.5896, 9.9842, 'Eppendorf, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '2 hours', NOW(), false),
(2, 'Defekte Ampel', 'Ampel funktioniert nicht - Winterhude', 3, 1, 53.5988, 10.0023, 'Winterhude, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '1 hour', NOW(), false),
(2, 'Stau auf der Autobahn', 'Langer Stau - Alster', 3, 1, 53.5834, 9.9756, 'Alster, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '20 minutes', NOW(), false),
-- Eimsbüttel
(2, 'Gefährliche Kreuzung', 'Unübersichtliche Kreuzung - Eimsbüttel', 3, 1, 53.5745, 9.9478, 'Eimsbüttel, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '5 hours', NOW(), false),
(2, 'Überfüllte Mülltonne', 'Öffentliche Mülltonne ist voll - Schanzenviertel', 2, 1, 53.5689, 9.9345, 'Schanzenviertel, Hamburg', 1, false, 'confirmed', NOW() - INTERVAL '8 hours', NOW(), false),
-- Barmbek / Wandsbek
(2, 'Stromausfall', 'Stromausfall in der Gegend - Barmbek', 4, 1, 53.5856, 10.0389, 'Barmbek, Hamburg', 5, false, 'confirmed', NOW() - INTERVAL '30 minutes', NOW(), false),
(2, 'Radar-Blitzer', 'Geschwindigkeitskontrolle - Wandsbek', 3, 1, 53.5723, 10.0867, 'Wandsbek, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '1 hour', NOW(), false),
-- Altona
(2, 'Brücke benötigt Reparatur', 'Sichtbare Schäden - Altona', 1, 1, 53.5512, 9.9356, 'Altona, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '12 hours', NOW(), false),
(2, 'Gasgeruch', 'Gasgeruch in der Nähe - Ottensen', 4, 1, 53.5634, 9.9123, 'Ottensen, Hamburg', 5, false, 'confirmed', NOW() - INTERVAL '10 minutes', NOW(), false),
-- Harburg
(2, 'Wasserverschmutzung', 'Verdächtige Substanzen im Wasser - Harburg', 2, 1, 53.4612, 9.9845, 'Harburg, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '24 hours', NOW(), false),
(2, 'Defekte Straßenbeleuchtung', 'Dunkler Bereich - Harburg Center', 3, 1, 53.4534, 9.9678, 'Harburg-Center, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '2 days', NOW(), false),
-- Bergedorf
(2, 'Schlagloch auf der Straße', 'Großes Schlagloch - Bergedorf', 1, 1, 53.4889, 10.2123, 'Bergedorf, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '6 hours', NOW(), false),
-- Blankenese
(2, 'Umgestürzter Baum', 'Baum blockiert - Blankenese', 2, 1, 53.5634, 9.8234, 'Blankenese, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '3 hours', NOW(), false),
-- Airport
(2, 'Stau auf der Autobahn', 'Stau Richtung Flughafen', 3, 1, 53.6312, 9.9912, 'Flughafen, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '40 minutes', NOW(), false),
-- Hauptbahnhof
(2, 'Polizeikontrolle', 'Kontrolle am Hauptbahnhof', 3, 1, 53.5527, 10.0069, 'Hauptbahnhof, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '1 hour', NOW(), false),
-- Jungfernstieg
(2, 'Verdächtige Aktivität', 'Ungewöhnliche Aktivität - Jungfernstieg', 3, 1, 53.5534, 9.9932, 'Jungfernstieg, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '4 hours', NOW(), false),
-- More random locations in Hamburg
(2, 'Radar-Blitzer', 'Blitzer auf A7 Richtung Süden', 3, 1, 53.5234, 9.9567, 'A7, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '5 minutes', NOW(), false),
(2, 'Verkehrsunfall', 'Auffahrunfall auf A1', 3, 1, 53.5789, 10.1234, 'A1, Hamburg', 5, false, 'confirmed', NOW() - INTERVAL '25 minutes', NOW(), false),
(2, 'Baustelle auf der Straße', 'Baustelle B75', 3, 1, 53.4567, 10.0123, 'B75, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '2 hours', NOW(), false),
(2, 'Defekte Ampel', 'Ampelausfall Grindelallee', 3, 1, 53.5678, 9.9789, 'Grindelallee, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '50 minutes', NOW(), false),
(2, 'Stau auf der Autobahn', 'Stau Elbtunnel', 3, 1, 53.5123, 9.9234, 'Elbtunnel, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '15 minutes', NOW(), false),
-- More scattered around Hamburg
(2, 'Illegale Müllentsorgung', 'Sperrmüll illegal entsorgt - Wilhelmsburg', 2, 1, 53.4987, 9.9876, 'Wilhelmsburg, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '1 day', NOW(), false),
(2, 'Wasserleck', 'Rohrbruch - Rotherbaum', 4, 1, 53.5612, 9.9723, 'Rotherbaum, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '3 hours', NOW(), false),
(2, 'Schlagloch auf der Straße', 'Tiefes Schlagloch - Horn', 1, 1, 53.5534, 10.0845, 'Horn, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '7 hours', NOW(), false),
(2, 'Polizeikontrolle', 'Kontrolle Stresemannstraße', 3, 1, 53.5456, 9.9512, 'Stresemannstraße, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '2 hours', NOW(), false),
(2, 'Radar-Blitzer', 'Blitzer Ballindamm', 3, 1, 53.5523, 9.9978, 'Ballindamm, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '35 minutes', NOW(), false),
-- Additional traffic reports
(2, 'Verkehrsunfall', 'Motorradunfall - Bahrenfeld', 3, 1, 53.5623, 9.9012, 'Bahrenfeld, Hamburg', 5, false, 'confirmed', NOW() - INTERVAL '1 hour', NOW(), false),
(2, 'Stau auf der Autobahn', 'Stau A24 Richtung Berlin', 3, 1, 53.6012, 10.0456, 'A24, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '10 minutes', NOW(), false),
(2, 'Baustelle auf der Straße', 'Langfristige Baustelle - Bramfeld', 3, 1, 53.6123, 10.0678, 'Bramfeld, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '5 days', NOW(), false),
(2, 'Defekte Straßenlaterne', 'Mehrere Laternen defekt - Billstedt', 1, 1, 53.5345, 10.1012, 'Billstedt, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '2 days', NOW(), false),
(2, 'Gefährliche Kreuzung', 'Unbeschilderte Kreuzung - Jenfeld', 3, 1, 53.5678, 10.1234, 'Jenfeld, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '1 day', NOW(), false),
-- More infrastructure
(2, 'Beschädigter Bürgersteig', 'Stolperfalle - Hamm', 1, 1, 53.5534, 10.0523, 'Hamm, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '4 hours', NOW(), false),
(2, 'Überfüllte Mülltonne', 'Container voll - Dulsberg', 2, 1, 53.5789, 10.0345, 'Dulsberg, Hamburg', 1, false, 'confirmed', NOW() - INTERVAL '12 hours', NOW(), false),
(2, 'Umgestürzter Baum', 'Sturm-Schaden - Farmsen', 2, 1, 53.6056, 10.1089, 'Farmsen, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '8 hours', NOW(), false),
(2, 'Stromausfall', 'Teilweiser Stromausfall - Tonndorf', 4, 1, 53.5812, 10.1234, 'Tonndorf, Hamburg', 4, false, 'confirmed', NOW() - INTERVAL '45 minutes', NOW(), false),
(2, 'Radar-Blitzer', 'Neuer Blitzer - Rahlstedt', 3, 1, 53.6034, 10.1456, 'Rahlstedt, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '2 hours', NOW(), false),
-- Final batch
(2, 'Polizeikontrolle', 'Alkoholkontrolle - Volksdorf', 3, 1, 53.6512, 10.1678, 'Volksdorf, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '3 hours', NOW(), false),
(2, 'Verkehrsunfall', 'Kleinerer Unfall - Poppenbüttel', 3, 1, 53.6589, 10.0856, 'Poppenbüttel, Hamburg', 3, false, 'confirmed', NOW() - INTERVAL '1 hour', NOW(), false),
(2, 'Stau auf der Autobahn', 'Rush Hour Stau - Ochsenzoll', 3, 1, 53.6712, 9.9845, 'Ochsenzoll, Hamburg', 2, false, 'confirmed', NOW() - INTERVAL '30 minutes', NOW(), false);
