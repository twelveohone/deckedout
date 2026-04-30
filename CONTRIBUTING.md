# Contributing Guide

## Active project scope

Active development happens in `mobile-game` (client) and `backend-api` (server).

- Mobile: build features in `mobile-game`; run `npm run start` from there.
- API: build features in `backend-api`; deploy root directory `backend-api` on Render.

## Reference code policy

`archive-web` is reference-only.

- Do not add new features in `archive-web`.
- Do not treat `archive-web` as the implementation target.
- Use it only to inspect prior behavior or logic ideas while building the mobile app.

## Practical workflow

1. Open and edit files in `mobile-game`.
2. Use `archive-web` only when you need to compare behavior.
3. Keep commits focused on the mobile app unless you are explicitly documenting or reorganizing project structure.
