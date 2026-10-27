# Zomboid Loadout

A compact, dark Workshop library for choosing Project Zomboid mods and copying server configuration into Hostinger.

## Run locally

Requires Node.js 22 or newer. There are no npm dependencies to install.

```powershell
cd "D:\Pogi Justine\Documents\Default Project\pz-mod-picker"
npm start
```

Open **http://localhost:3000**. Individual Workshop links, numeric IDs, and public collections work immediately.

### Enable Workshop search

1. Get a Steam Web API key at https://steamcommunity.com/dev/apikey.
2. Copy `.env.example` to `.env.local`.
3. Set `STEAM_WEB_API_KEY=your_key` in `.env.local`.
4. Restart the local server.

Both `npm start` and `npm run dev` load `.env` first, then `.env.local`. Values in `.env.local` override `.env`; existing process environment variables take precedence over both files.

The key is used only by the backend. Do not put it in `public/`, browser code, or a Git commit. Without a key, the app explains how to enable search and still supports imports.

## Deploy on Vercel

1. Put the contents of this `pz-mod-picker` folder in a Git repository and import it into Vercel.
2. Use **Other** as the framework preset. If the app is inside a larger repository, set **Root Directory** to `pz-mod-picker`.
3. `vercel.json` sets the static output directory to `public` and configures the `/api/workshop` Node.js function. No build command is required.
4. Add `STEAM_WEB_API_KEY` under **Settings → Environment Variables** for the deployment environments you use.
5. Deploy, or redeploy after changing the key.

Alternatively, run `npx vercel` from this folder and follow the prompts. Deployment itself has not been performed for you.

## Use it

1. Search by name, or switch to **Import links or collection**. Blank searches show the most subscribed mods. Build filters use author-supplied Steam tags.
2. Select individual mods or use **Select shown**. Filter an imported collection by name, Workshop ID, or detected Mod ID.
3. Open **Details & Mod IDs** on a card, or click a selected mod's name, to open its details modal. Review the full description, choose variants, or enter corrected IDs separated by semicolons. Changes to selected mods save automatically; unselected edits apply when you choose **Add to loadout**. Close with **Done**, the close button, Escape, or the backdrop.
4. Use the up/down controls beside a selected mod to change export order. Dependencies are not fetched or sorted automatically.
5. Choose **Server build**. Build 42 prefixes each exported Mod ID with `\`; Build 41 uses plain IDs. Copy **Load Mods** into Hostinger's **Load Mods** field (`Mods`), then copy **Install Workshop Items** into **Install Workshop Items** (`WorkshopItems`). Use the server settings, not **Steam workshop items** under **Updates**.
6. Save the configuration and restart your game server.

When editing an `.ini` file instead of panel fields, add the setting name. For example, on Build 42:

```ini
WorkshopItems=3825220364
Mods=\SpiffBoy
```

Both output fields and clipboard values use a single line, with semicolons and no added spaces or setting-name prefixes. Long values scroll horizontally. The app removes duplicate IDs and preserves the selected order. Selections, manual Mod ID edits, and server build are saved in the current browser. **Clear** has an **Undo** action. The Build 42 prefix follows the [AMP Project Zomboid template's Load Mods instructions](https://github.com/CubeCoders/AMPTemplates/blob/main/project-zomboidconfig.json).

## Limits

- Import up to 100 links or IDs per request, resolving to at most 300 unique mods. A loadout can contain 300 items.
- Public collections can include nested collections, with limits of 30 collections and four levels below the root. Cycles are deduplicated.
- Mod IDs are suggestions extracted from descriptions, not authoritative Steam metadata. Check the Workshop page or the `id=` entry in the downloaded `mod.info` file when needed.
- Copying Mod IDs is disabled until a server build is chosen and every selected item has valid IDs. Workshop IDs can still be copied.
- Private, removed, banned, and other-game items are excluded with import notes.
- Dependencies, mod conflicts, load-order rules, and exact build compatibility are not validated. Map mods can require separate `Map` configuration. Follow the mod author's and your server build's instructions.
- Steam availability and rate limits apply. This is a lightweight utility, not a full Workshop mirror.

## Checks

```sh
npm test
```

Tests cover input validation, 64-bit IDs, Mod ID extraction, nested collections, duplicates, unavailable items, limits, search parameters, and HTTP error handling. Search tests use a mocked Steam transport; a real API key is needed to verify live Workshop search.

## Files

- `public/` — static interface; all remote text is rendered as text, never HTML.
- `api/workshop.js` — Vercel request handler.
- `lib/workshop.js` — Steam API calls, validation, collection expansion, and Mod ID extraction.
- `server.mjs` — dependency-free local server for the same interface and API handler.
- `vercel.json` — deployment output, function timeout, and browser security headers.

Workshop thumbnails are loaded directly from Steam's returned preview URLs. The source of each thumbnail remains the item's Steam Workshop page; no third-party raster assets are bundled. Icons are original SVGs. The self-hosted Geist Latin variable font comes from Google Fonts (`https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwcGFU.woff2`); its SIL Open Font License is included at `public/fonts/OFL.txt`. This project is not affiliated with Valve, The Indie Stone, or Hostinger.
