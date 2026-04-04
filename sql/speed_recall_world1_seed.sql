-- Speed Recall World 1: Foundations — 15 levels
-- Difficulty progression: 3 shapes @ 4s → 7 shapes @ 3s
-- Design principle: never increase more than ONE parameter at a time

INSERT INTO side_campaign_levels (id, mode, world_number, level_number, world_name, difficulty, level_data) VALUES

-- Level 1: First Look — 3 shapes, well-spaced, generous time
('sr_w1_l1', 'speed_recall', 1, 1, 'Foundations', 1,
 '{"shapeCount":3,"viewingTime":4.0,"minDistance":28,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle"]}'),

-- Level 2: Getting Comfortable — same count/time, slightly closer spacing
('sr_w1_l2', 'speed_recall', 1, 2, 'Foundations', 1,
 '{"shapeCount":3,"viewingTime":4.0,"minDistance":25,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle"]}'),

-- Level 3: A Little Faster — first time reduction
('sr_w1_l3', 'speed_recall', 1, 3, 'Foundations', 2,
 '{"shapeCount":3,"viewingTime":3.5,"minDistance":25,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle"]}'),

-- Level 4: One More — 4th shape + gold colour + diamond
('sr_w1_l4', 'speed_recall', 1, 4, 'Foundations', 2,
 '{"shapeCount":4,"viewingTime":4.0,"minDistance":24,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012"],"shapePool":["circle","square","triangle","diamond"]}'),

-- Level 5: Tighter Space — less time + closer spacing
('sr_w1_l5', 'speed_recall', 1, 5, 'Foundations', 3,
 '{"shapeCount":4,"viewingTime":3.5,"minDistance":22,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012"],"shapePool":["circle","square","triangle","diamond"]}'),

-- Level 6: Cluster Challenge — shapes can cluster more
('sr_w1_l6', 'speed_recall', 1, 6, 'Foundations', 3,
 '{"shapeCount":4,"viewingTime":3.5,"minDistance":20,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012"],"shapePool":["circle","square","triangle","diamond"]}'),

-- Level 7: High Five — 5th shape + purple + star
('sr_w1_l7', 'speed_recall', 1, 7, 'Foundations', 3,
 '{"shapeCount":5,"viewingTime":4.0,"minDistance":22,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7"],"shapePool":["circle","square","triangle","diamond","star"]}'),

-- Level 8: Quick Scan — 5 shapes, less time
('sr_w1_l8', 'speed_recall', 1, 8, 'Foundations', 4,
 '{"shapeCount":5,"viewingTime":3.5,"minDistance":22,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7"],"shapePool":["circle","square","triangle","diamond","star"]}'),

-- Level 9: Close Quarters — tighter 5-shape layouts
('sr_w1_l9', 'speed_recall', 1, 9, 'Foundations', 4,
 '{"shapeCount":5,"viewingTime":3.5,"minDistance":20,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7"],"shapePool":["circle","square","triangle","diamond","star"]}'),

-- Level 10: Under Pressure — 3.0s for the first time
('sr_w1_l10', 'speed_recall', 1, 10, 'Foundations', 5,
 '{"shapeCount":5,"viewingTime":3.0,"minDistance":20,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7"],"shapePool":["circle","square","triangle","diamond","star"]}'),

-- Level 11: Crowded Canvas — 6th shape + orange + hexagon
('sr_w1_l11', 'speed_recall', 1, 11, 'Foundations', 5,
 '{"shapeCount":6,"viewingTime":3.5,"minDistance":20,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055"],"shapePool":["circle","square","triangle","diamond","star","hexagon"]}'),

-- Level 12: Six Pack — 6 shapes at standard time
('sr_w1_l12', 'speed_recall', 1, 12, 'Foundations', 5,
 '{"shapeCount":6,"viewingTime":3.0,"minDistance":20,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055"],"shapePool":["circle","square","triangle","diamond","star","hexagon"]}'),

-- Level 13: Precision Required — tight 6-shape spacing
('sr_w1_l13', 'speed_recall', 1, 13, 'Foundations', 6,
 '{"shapeCount":6,"viewingTime":3.0,"minDistance":18,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055"],"shapePool":["circle","square","triangle","diamond","star","hexagon"]}'),

-- Level 14: Lucky Seven — 7th shape + pink + pentagon
('sr_w1_l14', 'speed_recall', 1, 14, 'Foundations', 6,
 '{"shapeCount":7,"viewingTime":3.5,"minDistance":18,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon"]}'),

-- Level 15: Foundations Complete — World 1 finale, full difficulty
('sr_w1_l15', 'speed_recall', 1, 15, 'Foundations', 6,
 '{"shapeCount":7,"viewingTime":3.0,"minDistance":17,"colorPool":["#FF6B6B","#0984E3","#00B894","#D4A012","#6C5CE7","#E17055","#FD79A8"],"shapePool":["circle","square","triangle","diamond","star","hexagon","pentagon"]}')

ON CONFLICT (id) DO UPDATE SET
  difficulty = EXCLUDED.difficulty,
  level_data = EXCLUDED.level_data;
