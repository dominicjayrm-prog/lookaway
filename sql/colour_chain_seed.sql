-- Colour Chain: All 2 Worlds — 24 levels total (12 per world)
-- World 1 "Palette": 3×3 grid, 3-4 colours, 4s-2.5s view, 4-6 recall rounds
-- World 2 "Mosaic": 3×4→4×4 grid, 4-6 colours, 2.5s-1.5s view, 6-8 recall rounds

INSERT INTO side_campaign_levels (id, mode, world_number, level_number, world_name, difficulty, level_data) VALUES

-- ═══ WORLD 1: PALETTE ═══

('cc_w1_l1', 'colour_chain', 1, 1, 'Palette', 1,
 '{"gridCols":3,"gridRows":3,"viewTime":4,"colorCount":3,"recallRounds":3,"colorPool":["#FF6B6B","#0984E3","#00B894"]}'),

('cc_w1_l2', 'colour_chain', 1, 2, 'Palette', 1,
 '{"gridCols":3,"gridRows":3,"viewTime":3.5,"colorCount":3,"recallRounds":3,"colorPool":["#FF6B6B","#0984E3","#00B894"]}'),

('cc_w1_l3', 'colour_chain', 1, 3, 'Palette', 2,
 '{"gridCols":3,"gridRows":3,"viewTime":3.5,"colorCount":3,"recallRounds":4,"colorPool":["#FF6B6B","#0984E3","#F9CA24"]}'),

('cc_w1_l4', 'colour_chain', 1, 4, 'Palette', 2,
 '{"gridCols":3,"gridRows":3,"viewTime":3.5,"colorCount":4,"recallRounds":4,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"]}'),

('cc_w1_l5', 'colour_chain', 1, 5, 'Palette', 3,
 '{"gridCols":3,"gridRows":4,"viewTime":3.5,"colorCount":4,"recallRounds":4,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"]}'),

('cc_w1_l6', 'colour_chain', 1, 6, 'Palette', 3,
 '{"gridCols":3,"gridRows":4,"viewTime":3,"colorCount":4,"recallRounds":4,"colorPool":["#FF6B6B","#0984E3","#00B894","#6C5CE7"]}'),

('cc_w1_l7', 'colour_chain', 1, 7, 'Palette', 3,
 '{"gridCols":3,"gridRows":4,"viewTime":3,"colorCount":4,"recallRounds":5,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24"]}'),

('cc_w1_l8', 'colour_chain', 1, 8, 'Palette', 4,
 '{"gridCols":3,"gridRows":4,"viewTime":3,"colorCount":5,"recallRounds":5,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

('cc_w1_l9', 'colour_chain', 1, 9, 'Palette', 4,
 '{"gridCols":3,"gridRows":4,"viewTime":2.5,"colorCount":5,"recallRounds":5,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

('cc_w1_l10', 'colour_chain', 1, 10, 'Palette', 4,
 '{"gridCols":3,"gridRows":4,"viewTime":2.5,"colorCount":5,"recallRounds":6,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

('cc_w1_l11', 'colour_chain', 1, 11, 'Palette', 5,
 '{"gridCols":3,"gridRows":4,"viewTime":2.5,"colorCount":5,"recallRounds":6,"colorPool":["#FF6B6B","#0984E3","#00B894","#E17055","#6C5CE7"]}'),

('cc_w1_l12', 'colour_chain', 1, 12, 'Palette', 5,
 '{"gridCols":3,"gridRows":4,"viewTime":2.5,"colorCount":5,"recallRounds":6,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

-- ═══ WORLD 2: MOSAIC ═══

('cc_w2_l1', 'colour_chain', 2, 1, 'Mosaic', 5,
 '{"gridCols":3,"gridRows":4,"viewTime":2.5,"colorCount":5,"recallRounds":6,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

('cc_w2_l2', 'colour_chain', 2, 2, 'Mosaic', 6,
 '{"gridCols":4,"gridRows":4,"viewTime":2.5,"colorCount":5,"recallRounds":6,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7"]}'),

('cc_w2_l3', 'colour_chain', 2, 3, 'Mosaic', 6,
 '{"gridCols":4,"gridRows":4,"viewTime":2.5,"colorCount":5,"recallRounds":6,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#E17055"]}'),

('cc_w2_l4', 'colour_chain', 2, 4, 'Mosaic', 6,
 '{"gridCols":4,"gridRows":4,"viewTime":2.3,"colorCount":5,"recallRounds":6,"colorPool":["#FF6B6B","#0984E3","#00B894","#6C5CE7","#E17055"]}'),

('cc_w2_l5', 'colour_chain', 2, 5, 'Mosaic', 7,
 '{"gridCols":4,"gridRows":4,"viewTime":2.3,"colorCount":6,"recallRounds":6,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('cc_w2_l6', 'colour_chain', 2, 6, 'Mosaic', 7,
 '{"gridCols":4,"gridRows":4,"viewTime":2,"colorCount":6,"recallRounds":7,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('cc_w2_l7', 'colour_chain', 2, 7, 'Mosaic', 8,
 '{"gridCols":4,"gridRows":4,"viewTime":2,"colorCount":6,"recallRounds":7,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#FD79A8"]}'),

('cc_w2_l8', 'colour_chain', 2, 8, 'Mosaic', 8,
 '{"gridCols":4,"gridRows":4,"viewTime":2,"colorCount":6,"recallRounds":7,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('cc_w2_l9', 'colour_chain', 2, 9, 'Mosaic', 8,
 '{"gridCols":4,"gridRows":4,"viewTime":1.8,"colorCount":6,"recallRounds":7,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('cc_w2_l10', 'colour_chain', 2, 10, 'Mosaic', 9,
 '{"gridCols":4,"gridRows":4,"viewTime":1.8,"colorCount":6,"recallRounds":8,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('cc_w2_l11', 'colour_chain', 2, 11, 'Mosaic', 9,
 '{"gridCols":4,"gridRows":4,"viewTime":1.5,"colorCount":6,"recallRounds":8,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}'),

('cc_w2_l12', 'colour_chain', 2, 12, 'Mosaic', 10,
 '{"gridCols":4,"gridRows":4,"viewTime":1.5,"colorCount":6,"recallRounds":8,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"]}')

ON CONFLICT (id) DO UPDATE SET level_data = EXCLUDED.level_data, difficulty = EXCLUDED.difficulty;
