const { neon } = require('@neondatabase/serverless');

const GAMES = new Set(['snake', 'coin', 'memory', 'polyrush']);
let schemaPromise;

function respond(res, status, body) {
  return res.status(status).json(body);
}

function validGame(value) {
  return typeof value === 'string' && GAMES.has(value);
}

async function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = sql`
      CREATE TABLE IF NOT EXISTS arcade_scores (
        game TEXT NOT NULL CHECK (game IN ('snake', 'coin', 'memory', 'polyrush')),
        player_name TEXT NOT NULL CHECK (char_length(player_name) BETWEEN 1 AND 14),
        score DOUBLE PRECISION NOT NULL CHECK (score > 0 AND score < 'Infinity'::double precision),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (game, player_name)
      )
    `.catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

module.exports = async function leaderboard(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return respond(res, 405, { error: 'Method not allowed' });
  }

  let body = req.body;
  if (req.method === 'POST' && typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return respond(res, 400, { error: 'Invalid score submission' });
    }
  }

  const game = req.method === 'GET'
    ? req.query && req.query.game
    : body && body.game;
  if (!validGame(game)) return respond(res, 400, { error: 'Unknown game' });

  let score, name;
  if (req.method === 'POST') {
    if (!body || body.game !== game || typeof body.name !== 'string') {
      return respond(res, 400, { error: 'Invalid score submission' });
    }

    score = Number(body.score);
    if (!Number.isFinite(score) || score <= 0 || score > Number.MAX_SAFE_INTEGER ||
        (game !== 'polyrush' && !Number.isInteger(score))) {
      return respond(res, 400, { error: 'Invalid score' });
    }

    name = body.name.normalize('NFKC')
      .replace(/[^A-Z0-9 _.-]/gi, '')
      .trim()
      .toUpperCase()
      .slice(0, 14) || 'ANONYMOUS';
  }

  if (!process.env.DATABASE_URL) {
    return respond(res, 503, { error: 'Leaderboard database is not configured' });
  }

  const sql = neon(process.env.DATABASE_URL);
  try {
    await ensureSchema(sql);

    if (req.method === 'GET') {
      const scores = game === 'memory'
        ? await sql`
            SELECT player_name AS name, score
            FROM arcade_scores
            WHERE game = ${game}
            ORDER BY score ASC, created_at ASC
            LIMIT 10
          `
        : await sql`
            SELECT player_name AS name, score
            FROM arcade_scores
            WHERE game = ${game}
            ORDER BY score DESC, created_at ASC
            LIMIT 10
          `;
      return respond(res, 200, {
        scores: scores.map(row => ({ name: row.name, score: Number(row.score) }))
      });
    }

    const saved = game === 'memory'
      ? await sql`
          INSERT INTO arcade_scores (game, player_name, score)
          VALUES (${game}, ${name}, ${score})
          ON CONFLICT (game, player_name) DO UPDATE
          SET score = EXCLUDED.score, created_at = now()
          WHERE arcade_scores.score > EXCLUDED.score
          RETURNING score
        `
      : await sql`
          INSERT INTO arcade_scores (game, player_name, score)
          VALUES (${game}, ${name}, ${score})
          ON CONFLICT (game, player_name) DO UPDATE
          SET score = EXCLUDED.score, created_at = now()
          WHERE arcade_scores.score < EXCLUDED.score
          RETURNING score
        `;

    return respond(res, 200, { ok: true, improved: saved.length > 0 });
  } catch (error) {
    console.error('Leaderboard request failed:', error);
    return respond(res, 500, { error: 'Leaderboard request failed' });
  }
};
