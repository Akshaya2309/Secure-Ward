# SecureWard OS - Backend

Node.js REST API for the SecureWard frontend. **No dependencies**: only the built-in `http` and `fs` modules, as described in the project's architecture slide (Client tier -> Node.js HTTP tier -> JSON file store).

## Run

```bash
node server.js          # or: npm start
# -> http://localhost:3000
```

Requires Node 16+. `data.json` is created and seeded automatically on first start.

Options (env vars): `PORT` (3000), `HOST` (0.0.0.0), `DATA_FILE` (./data.json), `CORS_ORIGIN` (only needed if the frontend is served from a different origin, e.g. `CORS_ORIGIN=http://localhost:5500`).

## Frontend

The server hosts everything in `public/`. Your zip contained `css/` and `js/` (already copied in) but **no `index.html`** - put it in `public/` and the app will load at `/`. `js/store.js` auto-detects the API by calling `GET /api/stats`; if the server isn't running it falls back to localStorage, as before.

## API

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/stats` | Dashboard KPIs, lockdown state, DEFCON level |
| POST | `/api/lockdown` | `{active: bool}` - engaging locks every cell |
| GET / POST | `/api/inmates` | POST validates fields and cell capacity (409 if full) |
| GET / PUT / DELETE | `/api/inmates/:id` | GET includes `incidents`, `visits`, `medical`; DELETE cascades to all linked records |
| GET | `/api/cells` | `currentOccupants` computed live (released inmates excluded) |
| POST | `/api/cells/:id/toggle-lock` | 423 if a lockdown is active and the door is locked |
| GET / POST | `/api/incidents` | An "Isolation"/"Solitary" action sets the inmate to Isolation and moves them to a free D-block cell |
| GET / POST | `/api/visits` | Cannot schedule for released inmates |
| PUT | `/api/visits/:id/status` | Scheduled, Completed, Denied, Cancelled |
| GET / POST | `/api/medical` | |
| POST | `/api/reset` | Restore seed data |
| GET | `/api/health` | Liveness check |

Errors are always `{ "error": "message" }` with an appropriate status code (the UI shows this text in the intake form).

## Test

```bash
npm test     # 17 checks covering every endpoint, validation, cascade delete, lockdown
```

## Notes

- Writes are atomic (temp file + rename), so a crash can't corrupt `data.json`.
- Input is validated, trimmed and length-limited; PUT only accepts whitelisted fields; static serving blocks path traversal.
- Dashboard `totalInmates`, `visitsToday` and `pendingMedicalCheckups` use baseline figures from `seed.js` (`facilityStats`), because the sample data has only 6 inmates but the dashboard shows a 148/180 facility. Edit those values in `seed.js` / `data.json` to suit.
- **There is no login.** Anyone who can reach the server can read and change records. The frontend has no login screen, so I didn't add one; add authentication before exposing it beyond localhost or a demo.
