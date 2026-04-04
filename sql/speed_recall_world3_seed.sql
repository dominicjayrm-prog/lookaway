-- Speed Recall World 3: Mastermind — 15 levels
-- Picks up from World 2 finale (10 shapes, 2.5s, 11%) and pushes to 15 shapes @ 2.0s
-- The ultimate Speed Recall challenge — elite spatial memory required

INSERT INTO side_campaign_levels (id, mode, world_number, level_number, world_name, difficulty, level_data) VALUES

-- Level 1: Warm Up — eases into World 3
('sr_w3_l1', 'speed_recall', 3, 1, 'Mastermind', 7,
 '{"shapeCount":9,"viewingTime":2.5,"minDistance":12,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross"]}'),

-- Level 2: Glance — 9 shapes, fastest viewing so far
('sr_w3_l2', 'speed_recall', 3, 2, 'Mastermind', 8,
 '{"shapeCount":9,"viewingTime":2.3,"minDistance":12,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross"]}'),

-- Level 3: Ten Again — same as W2 finale baseline
('sr_w3_l3', 'speed_recall', 3, 3, 'Mastermind', 8,
 '{"shapeCount":10,"viewingTime":2.5,"minDistance":11,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow"]}'),

-- Level 4: Flash — 10 shapes, fast
('sr_w3_l4', 'speed_recall', 3, 4, 'Mastermind', 8,
 '{"shapeCount":10,"viewingTime":2.3,"minDistance":11,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow"]}'),

-- Level 5: Blink — first time at 2.0s
('sr_w3_l5', 'speed_recall', 3, 5, 'Mastermind', 9,
 '{"shapeCount":10,"viewingTime":2.0,"minDistance":11,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow"]}'),

-- Level 6: Eleven — 11th shape + deep purple + semicircle
('sr_w3_l6', 'speed_recall', 3, 6, 'Mastermind', 9,
 '{"shapeCount":11,"viewingTime":2.5,"minDistance":11,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle"]}'),

-- Level 7: Overload — 11 shapes, first time at 10% distance
('sr_w3_l7', 'speed_recall', 3, 7, 'Mastermind', 9,
 '{"shapeCount":11,"viewingTime":2.3,"minDistance":10,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle"]}'),

-- Level 8: Snapshot — 11 shapes at 2.0s
('sr_w3_l8', 'speed_recall', 3, 8, 'Mastermind', 9,
 '{"shapeCount":11,"viewingTime":2.0,"minDistance":10,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle"]}'),

-- Level 9: Dozen — 12th shape + lime + parallelogram
('sr_w3_l9', 'speed_recall', 3, 9, 'Mastermind', 9,
 '{"shapeCount":12,"viewingTime":2.3,"minDistance":10,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD","#2ECC71"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle","parallelogram"]}'),

-- Level 10: Chaos — 12 shapes at 2.0s, difficulty 10 begins
('sr_w3_l10', 'speed_recall', 3, 10, 'Mastermind', 10,
 '{"shapeCount":12,"viewingTime":2.0,"minDistance":10,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD","#2ECC71"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle","parallelogram"]}'),

-- Level 11: Overflow — 12 shapes, 9% distance
('sr_w3_l11', 'speed_recall', 3, 11, 'Mastermind', 10,
 '{"shapeCount":12,"viewingTime":2.0,"minDistance":9,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD","#2ECC71"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle","parallelogram"]}'),

-- Level 12: Thirteen — 13th shape + hot pink + trapezoid
('sr_w3_l12', 'speed_recall', 3, 12, 'Mastermind', 10,
 '{"shapeCount":13,"viewingTime":2.0,"minDistance":9,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD","#2ECC71","#E84393"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle","parallelogram","trapezoid"]}'),

-- Level 13: Fourteen — first time under 2.0s (1.8s)
('sr_w3_l13', 'speed_recall', 3, 13, 'Mastermind', 10,
 '{"shapeCount":13,"viewingTime":1.8,"minDistance":9,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD","#2ECC71","#E84393"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle","parallelogram","trapezoid"]}'),

-- Level 14: Impossible — 14th shape + turquoise + rhombus
('sr_w3_l14', 'speed_recall', 3, 14, 'Mastermind', 10,
 '{"shapeCount":14,"viewingTime":2.0,"minDistance":9,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD","#2ECC71","#E84393","#1ABC9C"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle","parallelogram","trapezoid","rhombus"]}'),

-- Level 15: Mastermind — the ultimate level: 15 shapes, 2.0s, 8% distance
('sr_w3_l15', 'speed_recall', 3, 15, 'Mastermind', 10,
 '{"shapeCount":15,"viewingTime":2.0,"minDistance":8,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8","#00CEC9","#636E72","#B8860B","#8E44AD","#2ECC71","#E84393","#1ABC9C","#F39C12"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon","oval","cross","arrow","semicircle","parallelogram","trapezoid","rhombus","kite"]}')

ON CONFLICT (id) DO UPDATE SET
  difficulty = EXCLUDED.difficulty,
  level_data = EXCLUDED.level_data;
