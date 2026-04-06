-- Counting Blitz: All 2 Worlds — 30 levels total (15 per world)
-- World 1 "Focus": 3 colours, 5-8 shapes, 5s chaos, 0.5s interval
-- World 2 "Frenzy": 4-5 colours, 8-12 shapes, 4-3s chaos, 0.3-0.2s interval

INSERT INTO side_campaign_levels (id, mode, world_number, level_number, world_name, difficulty, level_data) VALUES

-- ═══ WORLD 1: FOCUS ═══

('cb_w1_l1', 'counting_blitz', 1, 1, 'Focus', 1,
 '{"chaosDuration":5,"colorCount":2,"shapeCount":5,"colorPool":["#FF6B6B","#0984E3"],"shapePool":["circle","square"],"popInterval":0.6}'),

('cb_w1_l2', 'counting_blitz', 1, 2, 'Focus', 1,
 '{"chaosDuration":5,"colorCount":2,"shapeCount":5,"colorPool":["#FF6B6B","#0984E3"],"shapePool":["circle","square","triangle"],"popInterval":0.55}'),

('cb_w1_l3', 'counting_blitz', 1, 3, 'Focus', 2,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":5,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle"],"popInterval":0.55}'),

('cb_w1_l4', 'counting_blitz', 1, 4, 'Focus', 2,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":6,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle"],"popInterval":0.5}'),

('cb_w1_l5', 'counting_blitz', 1, 5, 'Focus', 2,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":6,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle","star"],"popInterval":0.5}'),

('cb_w1_l6', 'counting_blitz', 1, 6, 'Focus', 3,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":7,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle","star"],"popInterval":0.5}'),

('cb_w1_l7', 'counting_blitz', 1, 7, 'Focus', 3,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":7,"colorPool":["#FF6B6B","#0984E3","#F9CA24"],"shapePool":["circle","square","triangle","star"],"popInterval":0.45}'),

('cb_w1_l8', 'counting_blitz', 1, 8, 'Focus', 3,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":7,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle","star","diamond"],"popInterval":0.45}'),

('cb_w1_l9', 'counting_blitz', 1, 9, 'Focus', 4,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":8,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle","star","diamond"],"popInterval":0.45}'),

('cb_w1_l10', 'counting_blitz', 1, 10, 'Focus', 4,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":8,"colorPool":["#0984E3","#00B894","#F9CA24"],"shapePool":["circle","square","triangle","star","diamond"],"popInterval":0.4}'),

('cb_w1_l11', 'counting_blitz', 1, 11, 'Focus', 4,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":8,"colorPool":["#FF6B6B","#6C5CE7","#00B894"],"shapePool":["circle","square","triangle","star","diamond"],"popInterval":0.4}'),

('cb_w1_l12', 'counting_blitz', 1, 12, 'Focus', 5,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":8,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle","star","diamond","hexagon"],"popInterval":0.4}'),

('cb_w1_l13', 'counting_blitz', 1, 13, 'Focus', 5,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":8,"colorPool":["#FF6B6B","#0984E3","#F9CA24"],"shapePool":["circle","square","triangle","star","diamond","hexagon"],"popInterval":0.38}'),

('cb_w1_l14', 'counting_blitz', 1, 14, 'Focus', 5,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":8,"colorPool":["#6C5CE7","#00B894","#E17055"],"shapePool":["circle","square","triangle","star","diamond","hexagon"],"popInterval":0.35}'),

('cb_w1_l15', 'counting_blitz', 1, 15, 'Focus', 6,
 '{"chaosDuration":5,"colorCount":3,"shapeCount":8,"colorPool":["#FF6B6B","#0984E3","#00B894"],"shapePool":["circle","square","triangle","star","diamond","hexagon"],"popInterval":0.35}'),

-- ═══ WORLD 2: FRENZY ═══

('cb_w2_l1', 'counting_blitz', 2, 1, 'Frenzy', 6,
 '{"chaosDuration":5,"colorCount":4,"shapeCount":8,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"],"shapePool":["circle","square","triangle","star","diamond"],"popInterval":0.4}'),

('cb_w2_l2', 'counting_blitz', 2, 2, 'Frenzy', 6,
 '{"chaosDuration":5,"colorCount":4,"shapeCount":9,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"],"shapePool":["circle","square","triangle","star","diamond","hexagon"],"popInterval":0.38}'),

('cb_w2_l3', 'counting_blitz', 2, 3, 'Frenzy', 7,
 '{"chaosDuration":5,"colorCount":4,"shapeCount":9,"colorPool":["#FF6B6B","#0984E3","#00B894","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon"],"popInterval":0.35}'),

('cb_w2_l4', 'counting_blitz', 2, 4, 'Frenzy', 7,
 '{"chaosDuration":4.5,"colorCount":4,"shapeCount":9,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"],"shapePool":["circle","square","triangle","star","diamond","hexagon"],"popInterval":0.35}'),

('cb_w2_l5', 'counting_blitz', 2, 5, 'Frenzy', 7,
 '{"chaosDuration":4.5,"colorCount":4,"shapeCount":10,"colorPool":["#FF6B6B","#0984E3","#00B894","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.33}'),

('cb_w2_l6', 'counting_blitz', 2, 6, 'Frenzy', 8,
 '{"chaosDuration":4.5,"colorCount":4,"shapeCount":10,"colorPool":["#FF6B6B","#0984E3","#F9CA24","#E17055"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.3}'),

('cb_w2_l7', 'counting_blitz', 2, 7, 'Frenzy', 8,
 '{"chaosDuration":4,"colorCount":4,"shapeCount":10,"colorPool":["#FF6B6B","#0984E3","#00B894","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.3}'),

('cb_w2_l8', 'counting_blitz', 2, 8, 'Frenzy', 8,
 '{"chaosDuration":4,"colorCount":5,"shapeCount":10,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.3}'),

('cb_w2_l9', 'counting_blitz', 2, 9, 'Frenzy', 9,
 '{"chaosDuration":4,"colorCount":5,"shapeCount":11,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.28}'),

('cb_w2_l10', 'counting_blitz', 2, 10, 'Frenzy', 9,
 '{"chaosDuration":4,"colorCount":5,"shapeCount":11,"colorPool":["#FF6B6B","#0984E3","#00B894","#E17055","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.25}'),

('cb_w2_l11', 'counting_blitz', 2, 11, 'Frenzy', 9,
 '{"chaosDuration":3.5,"colorCount":5,"shapeCount":11,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.25}'),

('cb_w2_l12', 'counting_blitz', 2, 12, 'Frenzy', 10,
 '{"chaosDuration":3.5,"colorCount":5,"shapeCount":12,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.25}'),

('cb_w2_l13', 'counting_blitz', 2, 13, 'Frenzy', 10,
 '{"chaosDuration":3.5,"colorCount":5,"shapeCount":12,"colorPool":["#FF6B6B","#0984E3","#00B894","#E17055","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.22}'),

('cb_w2_l14', 'counting_blitz', 2, 14, 'Frenzy', 10,
 '{"chaosDuration":3,"colorCount":5,"shapeCount":12,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.22}'),

('cb_w2_l15', 'counting_blitz', 2, 15, 'Frenzy', 11,
 '{"chaosDuration":3,"colorCount":5,"shapeCount":12,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.2}')

ON CONFLICT (id) DO UPDATE SET level_data = EXCLUDED.level_data, difficulty = EXCLUDED.difficulty;
