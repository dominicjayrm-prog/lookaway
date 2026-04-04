-- Speed Recall World 2: Precision — 15 levels
-- Picks up from World 1 finale (7 shapes, 3.0s, 17%) and pushes to 10 shapes @ 2.5s
-- Design principle: never increase more than ONE parameter at a time

INSERT INTO side_campaign_levels (id, mode, world_number, level_number, world_name, difficulty, level_data) VALUES

-- Level 1: Back to Basics — ease into World 2
('sr_w2_l1', 'speed_recall', 2, 1, 'Precision', 5,
 '{"shapeCount":6,"viewingTime":3.0,"minDistance":18,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055"],"shapePool":["circle","square","triangle","diamond","star","hexagon"]}'),

-- Level 2: Tighter — first time under 3.0s viewing
('sr_w2_l2', 'speed_recall', 2, 2, 'Precision', 5,
 '{"shapeCount":6,"viewingTime":2.8,"minDistance":17,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055"],"shapePool":["circle","square","triangle","diamond","star","hexagon"]}'),

-- Level 3: Seven Again — 7 shapes, tighter spacing than W1 finale
('sr_w2_l3', 'speed_recall', 2, 3, 'Precision', 6,
 '{"shapeCount":7,"viewingTime":3.0,"minDistance":16,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon"]}'),

-- Level 4: Quick Seven — 7 shapes, time drops
('sr_w2_l4', 'speed_recall', 2, 4, 'Precision', 6,
 '{"shapeCount":7,"viewingTime":2.8,"minDistance":16,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon"]}'),

-- Level 5: Compressed — 7 shapes, 2.5s, tight
('sr_w2_l5', 'speed_recall', 2, 5, 'Precision', 6,
 '{"shapeCount":7,"viewingTime":2.5,"minDistance":15,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon"]}'),

-- Level 6: Eight Is Enough — 8th shape + teal + oval
('sr_w2_l6', 'speed_recall', 2, 6, 'Precision', 7,
 '{"shapeCount":8,"viewingTime":3.0,"minDistance":15,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval"]}'),

-- Level 7: Full Spectrum — 8 shapes, reduced time
('sr_w2_l7', 'speed_recall', 2, 7, 'Precision', 7,
 '{"shapeCount":8,"viewingTime":2.8,"minDistance":15,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval"]}'),

-- Level 8: Packed — 8 shapes, 2.5s, tight spacing
('sr_w2_l8', 'speed_recall', 2, 8, 'Precision', 7,
 '{"shapeCount":8,"viewingTime":2.5,"minDistance":14,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval"]}'),

-- Level 9: Dense — 8 shapes, even tighter
('sr_w2_l9', 'speed_recall', 2, 9, 'Precision', 7,
 '{"shapeCount":8,"viewingTime":2.5,"minDistance":13,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval"]}'),

-- Level 10: Nine Lives — 9th shape + grey + cross
('sr_w2_l10', 'speed_recall', 2, 10, 'Precision', 8,
 '{"shapeCount":9,"viewingTime":3.0,"minDistance":14,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross"]}'),

-- Level 11: Rapid Nine — 9 shapes, reduced time
('sr_w2_l11', 'speed_recall', 2, 11, 'Precision', 8,
 '{"shapeCount":9,"viewingTime":2.8,"minDistance":13,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross"]}'),

-- Level 12: Pixel Perfect — 9 shapes, tightest spacing yet
('sr_w2_l12', 'speed_recall', 2, 12, 'Precision', 8,
 '{"shapeCount":9,"viewingTime":2.5,"minDistance":12,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross"]}'),

-- Level 13: Double Digits — 10th shape + dark gold + arrow
('sr_w2_l13', 'speed_recall', 2, 13, 'Precision', 8,
 '{"shapeCount":10,"viewingTime":2.8,"minDistance":13,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow"]}'),

-- Level 14: Ten Under Pressure — 10 shapes, less time, tight
('sr_w2_l14', 'speed_recall', 2, 14, 'Precision', 9,
 '{"shapeCount":10,"viewingTime":2.5,"minDistance":12,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow"]}'),

-- Level 15: Precision Complete — World 2 finale, 10 shapes, 2.5s, 11% distance
('sr_w2_l15', 'speed_recall', 2, 15, 'Precision', 9,
 '{"shapeCount":10,"viewingTime":2.5,"minDistance":11,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow"]}')

ON CONFLICT (id) DO UPDATE SET
  difficulty = EXCLUDED.difficulty,
  level_data = EXCLUDED.level_data;
