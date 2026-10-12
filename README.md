# Krom FM v7

A kid's pretend radio station: Spotify songs, jingles, news and DJ talk in one running order.
Live at **https://arcuscapital.github.io/djraf6/**. Earlier versions stay live for comparison:
v6 at /djraf5/, v5 at /djraf4/, v4 at /djraf3/, v3 at /djraf2/, v2 at /djraf/, and the original at
https://arcuscapital.github.io/raf-radio-station/.

v7 = v6 plus:
- **Records kept in his Spotify account** (`src/cloud.ts`): a private playlist called "Krom FM
  data" whose description holds the totals, so every phone adds to the same 30-minute count.
  Each phone keeps the seconds it hasn't synced yet and adds them on the next sync (on load,
  every minute on air, and when a show ends or stops).
- **Record over the next song** (`src/webPlayer.ts`, `Show.overSong`): the third recorder option.
  He picks which Songs block the take goes before (so he knows the song), can listen to its start,
  and records 30 s at most. On air the song plays *in the browser* (Spotify Web Playback SDK),
  turned down under his voice, then comes up and carries on to its end; the Songs block then
  starts from its second song. If the browser can't play Spotify, it's a plain recording.
- Needs more Spotify permissions, so this version has its own login (log in once per phone).

## How it avoids repeated songs
Each "Play N Songs" block hands Spotify an exact list of tracks (`PUT /me/player/play {uris}`).
Spotify plays them back to back and stops by itself after the last one — no playlist, no repeat
mode, nothing to race. `src/runWatch.ts` notices the stop and the show moves on.

## Setup (once)
- Spotify developer dashboard → the Krom FM app → Redirect URIs → add `https://arcuscapital.github.io/djraf6/`.
- Spotify Premium is required for playback control.

## Develop
```
npm install
npm run dev     # http://localhost:5070/djraf6/
npm test
npm run build
```
Every push to `main` builds, tests and deploys via GitHub Actions. Built files get unique names and
`version.json` lets an open copy of the app reload itself when a newer build is live.
