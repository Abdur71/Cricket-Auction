# Dynamic Data Spreadsheet Setup

This setup keeps the players Google Sheet unchanged and moves only dynamic state to a second Google Spreadsheet.

## What Moves To The New Spreadsheet

- teams
- groups
- fixtures
- sold status
- current player
- stage view
- auction settings

## Apps Script Setup

1. Open your spreadsheet:
   `https://docs.google.com/spreadsheets/d/152hU_C60bM-9MtTYnHNybQDCOzlHrG4WAjGt8aH5rjY/edit?usp=sharing`
2. Go to `Extensions -> Apps Script`
3. Replace the default script with the contents of [scripts/google-apps-script/dynamic_data_web_app.gs](c:/Users/1234/Desktop/demo/scripts/google-apps-script/dynamic_data_web_app.gs)
4. In Apps Script, open `Project Settings`
5. Add a Script Property:
   - key: `DYNAMIC_DATA_API_TOKEN`
   - value: any long secret string you choose
6. Click `Deploy -> New deployment`
7. Choose `Web app`
8. Set:
   - Execute as: `Me`
   - Who has access: `Anyone`
9. Deploy and copy the Web App URL

## Vercel Environment Variables

Add these to your Vercel project:

- `ADMIN_PASSWORD`
- `AUTH_SECRET`
- `DYNAMIC_DATA_API_URL`
- `DYNAMIC_DATA_API_TOKEN`

`DYNAMIC_DATA_API_URL` should be the Apps Script Web App URL.

## Local Development

In PowerShell:

```powershell
$env:ADMIN_PASSWORD="123456"
$env:AUTH_SECRET="local-dev-secret"
$env:DYNAMIC_DATA_API_URL="YOUR_APPS_SCRIPT_WEB_APP_URL"
$env:DYNAMIC_DATA_API_TOKEN="YOUR_SECRET_TOKEN"
npm run local
```

## Sheet Tabs

The Apps Script will automatically create these tabs when needed:

- `teams`
- `groups`
- `fixtures`
- `sold_states`
- `current_player`
- `stage_view`
- `auction_settings`

Each tab stores:

- column A: `updatedAt`
- column B: JSON payload
