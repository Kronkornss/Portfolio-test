CREATE TABLE IF NOT EXISTS arcade_scores (
  game TEXT NOT NULL CHECK (game IN ('snake', 'coin', 'memory', 'polyrush')),
  player_name TEXT NOT NULL CHECK (char_length(player_name) BETWEEN 1 AND 14),
  score DOUBLE PRECISION NOT NULL CHECK (score > 0 AND score < 'Infinity'::double precision),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game, player_name)
);
