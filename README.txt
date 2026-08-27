# Kohat Zalmi Cricket Performance Website v3

Offline private team dashboard.

## What changed
- Removed built-in demo player and match data. The dashboard starts empty.
- Added day/night mood toggle, with automatic first-time mood based on local time.
- Added player management: player name, jersey number, role and optional player photo.
- Player photos are shown in player cards, top performers, ranking cards and player detail.
- Added delete controls for players and matches.
- Added a dedicated Add Player page.
- Player performance entry now increases the player's match count.
- Existing batting, bowling, ranking, analytics, venue and match features remain.
- Data is stored locally in the browser using localStorage. No backend/server is required.

## Run
Extract the ZIP and open `index.html`.

## Notes
Player photos are stored locally in the browser as part of the player record. Keep individual photos under 2 MB for best performance.
