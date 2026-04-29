-- Endgame 20 — Side-mode boss levels (positions 395-399 on the
-- Unified Brain Journey).
--
-- Each boss is a curated max-difficulty exemplar of its mode, intended
-- to test the absolute ceiling of mastery for players who've completed
-- the main 380-level campaign. Configurations push past existing
-- World-3 maxes where the runtime allows it.
--
-- Conventions: id = `<prefix>_boss`. mode matches the side-mode
-- discipline. world_number = 6 (slotted into the Inferno Core
-- world theme on the unified ladder). difficulty = 11 (one above the
-- existing top tier of 10).

INSERT INTO side_campaign_levels (id, mode, world_number, level_number, world_name, difficulty, level_data) VALUES

-- 395 — Speed Recall Boss "The Mind Map"
-- Pushes shape count beyond shipped max. Density (minDistance=15) is
-- the new lever — shapes pack tightly, so position recall has to be
-- precise even when there's no overlap.
('sr_boss', 'speed_recall', 6, 1, 'Endgame', 11,
 '{"shapeCount":10,"viewingTime":2.5,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"],"minDistance":15}'),

-- 396 — Snap Match Boss "The Spotter"
-- 10 shapes (more than World 3's 12 max would feel chaotic — 10 is
-- the sweet spot where 3 simultaneous changes are findable but
-- punishing). 1.2s view + every change type.
('sm_boss', 'snap_match', 6, 2, 'Endgame', 11,
 '{"shapeCount":10,"viewTime":1.2,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"],"changeTypes":["type","colour","removed","added","position"]}'),

-- 397 — Sequence Boss "The Conductor"
-- 12-shape sequence at 0.32s display per shape. Beyond what any
-- shipped Sequence level has demanded.
('seq_boss', 'sequence', 6, 3, 'Endgame', 11,
 '{"sequenceLength":12,"displayTime":0.32,"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8","#00CEC9"]}'),

-- 398 — Counting Blitz Boss "The Tally"
-- 6 colours (vs World 2 max of 5) + 16 shapes (vs 12) + 0.18s spawn
-- (vs 0.2s). The chaos window stays at 3s — already at the floor.
('cb_boss', 'counting_blitz', 6, 4, 'Endgame', 11,
 '{"chaosDuration":3,"colorCount":6,"shapeCount":16,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055"],"shapePool":["circle","square","triangle","star","diamond","hexagon","heart"],"popInterval":0.18}'),

-- 399 — Colour Chain Boss "The Pattern"
-- 4×5 grid (20 cells, beyond shipped max of 4×4) + 7 colours +
-- 10 recall rounds. View time stays at 1.5s — the runtime floor.
('cc_boss', 'colour_chain', 6, 5, 'Endgame', 11,
 '{"gridCols":4,"gridRows":5,"viewTime":1.5,"colorCount":7,"recallRounds":10,"colorPool":["#FF6B6B","#0984E3","#00B894","#F9CA24","#6C5CE7","#E17055","#FD79A8"]}')

ON CONFLICT (id) DO UPDATE SET
  level_data = EXCLUDED.level_data,
  difficulty = EXCLUDED.difficulty;
