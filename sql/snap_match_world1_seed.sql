-- Snap Match: Sharp Eyes (World 1) — 15 levels
-- Difficulty: 4 shapes @ 3s → 7 shapes @ 2s, simple changes → complex changes
-- Each level has 5 change types for 5 rounds

INSERT INTO side_campaign_levels (id, mode, world_number, level_number, world_name, difficulty, level_data) VALUES

-- Level 1: First Glance — 4 shapes, generous view time, easy changes
('sm_w1_l1', 'snap_match', 1, 1, 'Sharp Eyes', 1,
 '{"shapeCount":4,"viewTime":3.0,"shapePool":["circle","square","triangle"],"colorPool":["#FF6B6B","#0984E3","#00B894"],"changeTypes":["colour","colour","position","colour","position"]}'),

-- Level 2: Colour Swap — more colour changes
('sm_w1_l2', 'snap_match', 1, 2, 'Sharp Eyes', 1,
 '{"shapeCount":4,"viewTime":3.0,"shapePool":["circle","square","triangle"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"],"changeTypes":["colour","position","colour","colour","position"]}'),

-- Level 3: Something Moved — focus on position changes
('sm_w1_l3', 'snap_match', 1, 3, 'Sharp Eyes', 2,
 '{"shapeCount":4,"viewTime":2.8,"shapePool":["circle","square","triangle","star"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"],"changeTypes":["position","colour","position","position","colour"]}'),

-- Level 4: New Arrival — introduce 'added' change
('sm_w1_l4', 'snap_match', 1, 4, 'Sharp Eyes', 2,
 '{"shapeCount":4,"viewTime":2.8,"shapePool":["circle","square","triangle","star"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"],"changeTypes":["colour","position","added","colour","position"]}'),

-- Level 5: Gone Missing — introduce 'removed' change
('sm_w1_l5', 'snap_match', 1, 5, 'Sharp Eyes', 2,
 '{"shapeCount":5,"viewTime":2.8,"shapePool":["circle","square","triangle","star"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"],"changeTypes":["colour","removed","position","added","colour"]}'),

-- Level 6: Shape Shifter — introduce 'type' change
('sm_w1_l6', 'snap_match', 1, 6, 'Sharp Eyes', 3,
 '{"shapeCount":5,"viewTime":2.6,"shapePool":["circle","square","triangle","star","diamond"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"],"changeTypes":["type","colour","position","removed","added"]}'),

-- Level 7: Full Mix — all 5 change types
('sm_w1_l7', 'snap_match', 1, 7, 'Sharp Eyes', 3,
 '{"shapeCount":5,"viewTime":2.6,"shapePool":["circle","square","triangle","star","diamond"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"],"changeTypes":["colour","position","added","removed","type"]}'),

-- Level 8: More Shapes — 6 shapes
('sm_w1_l8', 'snap_match', 1, 8, 'Sharp Eyes', 3,
 '{"shapeCount":6,"viewTime":2.6,"shapePool":["circle","square","triangle","star","diamond"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"],"changeTypes":["position","type","colour","added","removed"]}'),

-- Level 9: Quick Look — reduced view time
('sm_w1_l9', 'snap_match', 1, 9, 'Sharp Eyes', 4,
 '{"shapeCount":6,"viewTime":2.4,"shapePool":["circle","square","triangle","star","diamond","hexagon"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"],"changeTypes":["removed","colour","type","position","added"]}'),

-- Level 10: Eagle Eye — 6 shapes, faster
('sm_w1_l10', 'snap_match', 1, 10, 'Sharp Eyes', 4,
 '{"shapeCount":6,"viewTime":2.2,"shapePool":["circle","square","triangle","star","diamond","hexagon"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"],"changeTypes":["type","removed","colour","position","added"]}'),

-- Level 11: Crowded — 7 shapes
('sm_w1_l11', 'snap_match', 1, 11, 'Sharp Eyes', 4,
 '{"shapeCount":7,"viewTime":2.2,"shapePool":["circle","square","triangle","star","diamond","hexagon"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"],"changeTypes":["colour","type","position","removed","added"]}'),

-- Level 12: Pressure — 7 shapes, faster view
('sm_w1_l12', 'snap_match', 1, 12, 'Sharp Eyes', 5,
 '{"shapeCount":7,"viewTime":2.0,"shapePool":["circle","square","triangle","star","diamond","hexagon"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"],"changeTypes":["position","added","type","colour","removed"]}'),

-- Level 13: Tricky — subtle changes, more shapes
('sm_w1_l13', 'snap_match', 1, 13, 'Sharp Eyes', 5,
 '{"shapeCount":7,"viewTime":2.0,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"],"changeTypes":["type","colour","removed","position","added"]}'),

-- Level 14: Expert — fast and dense
('sm_w1_l14', 'snap_match', 1, 14, 'Sharp Eyes', 5,
 '{"shapeCount":7,"viewTime":2.0,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"],"changeTypes":["removed","type","added","colour","position"]}'),

-- Level 15: Sharp Eyes Finale — max difficulty for world 1
('sm_w1_l15', 'snap_match', 1, 15, 'Sharp Eyes', 6,
 '{"shapeCount":7,"viewTime":2.0,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"],"changeTypes":["type","removed","position","added","colour"]}')

ON CONFLICT (id) DO UPDATE SET level_data = EXCLUDED.level_data, difficulty = EXCLUDED.difficulty;
