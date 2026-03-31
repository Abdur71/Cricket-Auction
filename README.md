# Cricket Auction System JavaScript Backend

This project keeps the existing frontend visuals intact and replaces the PHP backend with JavaScript serverless APIs for Vercel.

## Structure

- `frontend/`: original UI files, with only fetch URLs updated
- `backend/api/`: shared API handlers
- `backend/utils/`: CSV parsing, Google Drive link conversion, auth, storage helpers
- `backend/data/`: JSON state files
- `api/`: Vercel function entrypoints

## API Routes

- `GET /api/players`
- `GET /api/players/:id`
- `GET /api/current-player`
- `POST /api/current-player`
- `GET /api/teams`
- `POST /api/teams`
- `DELETE /api/team/:id`
- `GET /api/teams-with-players`
- `POST /api/admin/login`
- `GET /api/auth/session`
- `GET|POST /api/auth/logout`
- `GET|POST /api/auction-settings`
- `GET|POST /api/stage-view`
- `POST /api/sold-status`

## Environment Variables

- `AUTH_SECRET`: required for production
- `ADMIN_USERNAME`: optional, defaults to `admin`
- `ADMIN_PASSWORD`: optional plain-text override
- `ADMIN_PASSWORD_HASH`: optional bcrypt hash override
- `GOOGLE_SHEET_URL`: optional Google Sheet URL override

## Notes

- Google Drive links are normalized to `https://drive.google.com/uc?export=view&id=...`
- Google Sheet CSV is fetched and parsed in JavaScript
- JSON file writes work for local development and self-hosted Node environments
- On Vercel, filesystem writes are ephemeral, so persistent admin changes should eventually move to a database or blob store for full production durability
