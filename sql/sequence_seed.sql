-- Sequence: All 3 Worlds — 36 levels total (12 per world)
-- World 1 "First Steps": 3-5 shapes, 1.2s-0.8s display
-- World 2 "Memory Lane": 5-7 shapes, 0.8s-0.6s display
-- World 3 "Total Recall": 7-10 shapes, 0.6s-0.4s display

INSERT INTO side_campaign_levels (id, mode, world_number, level_number, world_name, difficulty, level_data) VALUES

-- ═══ WORLD 1: FIRST STEPS ═══

('seq_w1_l1', 'sequence', 1, 1, 'First Steps', 1,
 '{"sequenceLength":3,"displayTime":1.2,"shapePool":["circle","square","triangle"],"colorPool":["#FF6B6B","#0984E3","#00B894"]}'),

('seq_w1_l2', 'sequence', 1, 2, 'First Steps', 1,
 '{"sequenceLength":3,"displayTime":1.1,"shapePool":["circle","square","triangle"],"colorPool":["#FF6B6B","#0984E3","#00B894"]}'),

('seq_w1_l3', 'sequence', 1, 3, 'First Steps', 2,
 '{"sequenceLength":3,"displayTime":1.0,"shapePool":["circle","square","triangle","star"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"]}'),

('seq_w1_l4', 'sequence', 1, 4, 'First Steps', 2,
 '{"sequenceLength":4,"displayTime":1.0,"shapePool":["circle","square","triangle","star"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"]}'),

('seq_w1_l5', 'sequence', 1, 5, 'First Steps', 2,
 '{"sequenceLength":4,"displayTime":0.9,"shapePool":["circle","square","triangle","star"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"]}'),

('seq_w1_l6', 'sequence', 1, 6, 'First Steps', 3,
 '{"sequenceLength":4,"displayTime":0.9,"shapePool":["circle","square","triangle","star","diamond"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

('seq_w1_l7', 'sequence', 1, 7, 'First Steps', 3,
 '{"sequenceLength":4,"displayTime":0.85,"shapePool":["circle","square","triangle","star","diamond"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

('seq_w1_l8', 'sequence', 1, 8, 'First Steps', 3,
 '{"sequenceLength":5,"displayTime":0.85,"shapePool":["circle","square","triangle","star","diamond"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

('seq_w1_l9', 'sequence', 1, 9, 'First Steps', 3,
 '{"sequenceLength":5,"displayTime":0.8,"shapePool":["circle","square","triangle","star","diamond"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

('seq_w1_l10', 'sequence', 1, 10, 'First Steps', 4,
 '{"sequenceLength":5,"displayTime":0.8,"shapePool":["circle","square","triangle","star","diamond","hexagon"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('seq_w1_l11', 'sequence', 1, 11, 'First Steps', 4,
 '{"sequenceLength":5,"displayTime":0.75,"shapePool":["circle","square","triangle","star","diamond","hexagon"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('seq_w1_l12', 'sequence', 1, 12, 'First Steps', 4,
 '{"sequenceLength":5,"displayTime":0.7,"shapePool":["circle","square","triangle","star","diamond","hexagon"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

-- ═══ WORLD 2: MEMORY LANE ═══

('seq_w2_l1', 'sequence', 2, 1, 'Memory Lane', 4,
 '{"sequenceLength":5,"displayTime":0.8,"shapePool":["circle","square","triangle","star","diamond","hexagon"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('seq_w2_l2', 'sequence', 2, 2, 'Memory Lane', 5,
 '{"sequenceLength":5,"displayTime":0.75,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('seq_w2_l3', 'sequence', 2, 3, 'Memory Lane', 5,
 '{"sequenceLength":6,"displayTime":0.75,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

('seq_w2_l4', 'sequence', 2, 4, 'Memory Lane', 5,
 '{"sequenceLength":6,"displayTime":0.7,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

('seq_w2_l5', 'sequence', 2, 5, 'Memory Lane', 6,
 '{"sequenceLength":6,"displayTime":0.65,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

('seq_w2_l6', 'sequence', 2, 6, 'Memory Lane', 6,
 '{"sequenceLength":6,"displayTime":0.65,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

('seq_w2_l7', 'sequence', 2, 7, 'Memory Lane', 6,
 '{"sequenceLength":7,"displayTime":0.65,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

('seq_w2_l8', 'sequence', 2, 8, 'Memory Lane', 7,
 '{"sequenceLength":7,"displayTime":0.6,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

('seq_w2_l9', 'sequence', 2, 9, 'Memory Lane', 7,
 '{"sequenceLength":7,"displayTime":0.6,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

('seq_w2_l10', 'sequence', 2, 10, 'Memory Lane', 7,
 '{"sequenceLength":7,"displayTime":0.55,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

('seq_w2_l11', 'sequence', 2, 11, 'Memory Lane', 7,
 '{"sequenceLength":7,"displayTime":0.55,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

('seq_w2_l12', 'sequence', 2, 12, 'Memory Lane', 8,
 '{"sequenceLength":7,"displayTime":0.5,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}'),

-- ═══ WORLD 3: TOTAL RECALL ═══

('seq_w3_l1', 'sequence', 3, 1, 'Total Recall', 8,
 '{"sequenceLength":7,"displayTime":0.6,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l2', 'sequence', 3, 2, 'Total Recall', 8,
 '{"sequenceLength":8,"displayTime":0.55,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l3', 'sequence', 3, 3, 'Total Recall', 8,
 '{"sequenceLength":8,"displayTime":0.5,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l4', 'sequence', 3, 4, 'Total Recall', 9,
 '{"sequenceLength":8,"displayTime":0.5,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l5', 'sequence', 3, 5, 'Total Recall', 9,
 '{"sequenceLength":8,"displayTime":0.45,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l6', 'sequence', 3, 6, 'Total Recall', 9,
 '{"sequenceLength":9,"displayTime":0.45,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l7', 'sequence', 3, 7, 'Total Recall', 10,
 '{"sequenceLength":9,"displayTime":0.45,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l8', 'sequence', 3, 8, 'Total Recall', 10,
 '{"sequenceLength":9,"displayTime":0.4,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l9', 'sequence', 3, 9, 'Total Recall', 10,
 '{"sequenceLength":9,"displayTime":0.4,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l10', 'sequence', 3, 10, 'Total Recall', 10,
 '{"sequenceLength":10,"displayTime":0.4,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l11', 'sequence', 3, 11, 'Total Recall', 11,
 '{"sequenceLength":10,"displayTime":0.4,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

('seq_w3_l12', 'sequence', 3, 12, 'Total Recall', 12,
 '{"sequenceLength":10,"displayTime":0.35,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}')

ON CONFLICT (id) DO UPDATE SET level_data = EXCLUDED.level_data, difficulty = EXCLUDED.difficulty;
