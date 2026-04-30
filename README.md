# Card Game Workspace

This repository is now organized into clear folders:

- `mobile-game`: active Expo React Native app (main project to build and test)
- `backend-api`: Node API for Render (long-term: game logic + Postgres)
- `archive-web`: original web version kept only as reference

See `CONTRIBUTING.md` for the project workflow policy.

## Work in the mobile app

```bash
cd mobile-game
npm install
npm run start
```

Use Expo Go or an emulator from the QR/dev menu.

## Reference only

The `archive-web` folder contains the original Famous-generated web code and should be treated as a guide, not the active implementation target.
