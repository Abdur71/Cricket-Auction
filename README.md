# Cricket Auction System JavaScript Backend

This project keeps the existing frontend visuals intact and replaces the PHP backend with JavaScript serverless APIs for Vercel.

## Structure

- `frontend/`: original UI files, with only fetch URLs updated
- `backend/api/`: shared API handlers
- `backend/utils/`: CSV parsing, Google Drive link conversion, auth, storage helpers
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
- `GET|POST /api/auction-settings`
- `GET|POST /api/stage-view`
- `POST /api/sold-status`

## Environment Variables

- `AUTH_SECRET`: required for production
- `ADMIN_USERNAME`: optional, defaults to `admin`
- `ADMIN_PASSWORD`: optional plain-text override
- `ADMIN_PASSWORD_HASH`: optional bcrypt hash override
- `GOOGLE_SHEET_URL`: optional Google Sheet URL override
- `DYNAMIC_DATA_API_URL`: Apps Script web app URL for dynamic state
- `DYNAMIC_DATA_API_TOKEN`: shared secret for the dynamic-data web app

## Notes

- Google Drive links are normalized to `https://drive.google.com/uc?export=view&id=...`
- Google Sheet CSV is fetched and parsed in JavaScript
- Dynamic state can be redirected to a Google Apps Script web app backed by a second Google Spreadsheet
- Dynamic state now depends on the remote dynamic-data service being configured
