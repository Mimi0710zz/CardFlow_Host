# Google Drive 404 Fix V2

- Reworked Host Drive access around the same request pattern used by the working Client app.
- Stale cached fileId is cleared automatically.
- Every matching `cardflow-host-data.json` candidate is tried; a stale/unreadable 404 candidate is skipped.
- If no readable Host file exists, the app creates a new Host file.
- On first creation, the app does not immediately GET/PATCH the just-created file; the created payload is accepted locally and marked clean.
- Drive errors now include the exact operation (`findDataFiles`, `readFile`, `createFile`, `updateFile`, `createBackup`) in Console and UI.
- Critical ES-module imports are cache-busted so GitHub Pages cannot keep an older Drive module while loading a newer `app.js`.
