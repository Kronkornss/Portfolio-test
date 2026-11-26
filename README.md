# Luigi Portfolio

Luigi A. Lising's personal portfolio and browser arcade, featuring Snake, Flip the Coin, Memory, and Poly Rush.

## Features

- Responsive portfolio with an interactive arcade
- Poly Rush 3D racing game
- Shared, per-game leaderboards backed by PostgreSQL
- Per-browser personal-best stats

## Run locally

Serve the project root with a local static server to browse the portfolio. To test the leaderboard API locally, use Vercel's development server and set `DATABASE_URL` to a PostgreSQL connection string.

```sh
npm install
npx vercel dev
```

The API creates the `arcade_scores` table on its first request. The equivalent SQL schema is in `database/leaderboard.sql`.

## Deployment

The site is deployed on Vercel from the `main` branch. Configure `DATABASE_URL` in the Vercel project's environment variables for Production and Preview deployments. The connection string must remain server-side; it is only read by `api/leaderboard.js`.

## Project structure

- `index.html`, `style.css`, `script.js` — portfolio
- `arcade.js`, `arcade.css` — arcade interface and score reporting
- `game/polyrush/` — Poly Rush game
- `api/leaderboard.js` — shared leaderboard API
- `database/leaderboard.sql` — PostgreSQL leaderboard schema
