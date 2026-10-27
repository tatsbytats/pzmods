# Zomboid Loadout

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The user confirmed Vercel as the deployment target and requested a simple app. Plain HTML, CSS, and browser JavaScript with a Node.js Vercel function is the implementation choice. A dependency-free local Node.js server supports development.

## Users

Project Zomboid server owners choosing Steam Workshop mods and copying their configuration into Hostinger.

## Product Purpose

Search or import Workshop items, select the desired mods, and copy semicolon-separated Workshop IDs and internal Mod IDs.

## Operating Context

The user wants to deploy on Vercel later. Workshop search uses a server-side Steam Web API key. Public item and collection lookups work without a key. Hostinger is the destination for copied configuration, not an automated integration.

## Capabilities and Constraints

- Scope Steam content to Project Zomboid, App ID 108600.
- Support Workshop search, individual links or numeric IDs, and public collections.
- Keep Workshop IDs separate from internal Mod IDs.
- Match the Hostinger fields shown by the user: Load Mods first (`Mods`), then Install Workshop Items (`WorkshopItems`). Export and copy each value on one semicolon-separated line.
- Require a server-build choice for Mod ID exports. The AMP template specifies a leading backslash for each Build 42 Mod ID; Build 41 uses plain IDs.
- Deduplicate Workshop IDs without changing selection order.
- Extract suggested Mod IDs from descriptions and allow manual correction. Steam does not expose canonical internal Mod IDs.
- One Workshop item may contain several optional or mutually exclusive mods.
- Persist selections in the browser; no account or database is required.
- Build tags and descriptions are informational, not compatibility guarantees.

## Brand Commitments

The user chose a dark, Steam-like library layout. Use a familiar task-focused interface rather than a marketing page.

## Evidence on Hand

Valve documents GetPublishedFileDetails, GetCollectionDetails, and QueryFiles. A live lookup verified Workshop item 3825220364 as SpiffBoy [B42.21], with Mod ID SpiffBoy in its description. Hostinger documents semicolon-delimited WorkshopItems and Mods settings.

## Product Principles

- Make the two output lists clear and immediately copyable.
- Explain missing data instead of guessing.
- Keep the Steam key on the server.
- Favor a small, understandable app over dependencies and accounts.
