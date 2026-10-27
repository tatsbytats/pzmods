---
name: Zomboid Loadout
description: A compact graphite Workshop library with modal Mod ID editing and clear server exports.
colors:
  ground: "#0c1016"
  surface: "#141a23"
  raised: "#202936"
  field: "#0f141c"
  line: "#2b3544"
  line-strong: "#56677e"
  ink: "#edf1f7"
  muted: "#a0adc0"
  accent: "#b3cbfa"
  accent-hover: "#d7e5ff"
  accent-ink: "#152036"
  selected: "#1c2c42"
  warn: "#e5c18c"
  danger: "#f4aaa6"
typography:
  headline:
    fontFamily: 'Geist, "Segoe UI", system-ui, sans-serif'
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-.035em"
  title:
    fontFamily: 'Geist, "Segoe UI", system-ui, sans-serif'
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-.015em"
  body:
    fontFamily: 'Geist, "Segoe UI", system-ui, sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  card-title:
    fontFamily: 'Geist, "Segoe UI", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  control:
    fontFamily: 'Geist, "Segoe UI", system-ui, sans-serif'
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
  output:
    fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace'
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  compact: "5px"
  control: "6px"
  panel: "12px"
spacing:
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    padding: "7px 0"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.compact}"
    padding: "4px"
    height: "30px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
  tab-selected:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "7px 11px"
  suggestion:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "6px 8px"
  mod-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "9px"
  selected-open:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "4px"
    padding: "6px"
  mod-dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "14px"
    width: "min(820px, calc(100% - 40px))"
---

# Design System: Zomboid Loadout

## Overview

**Creative North Star: "Steam-like mod library"**

Near-black graphite surfaces, local Geist typography, and quiet blue actions refine the familiar Steam-like task UI. The premium character comes from compact spacing, restrained contrast, and consistent controls around real Workshop thumbnails.

Discovery and server exports remain separate, readable work areas. A shared native modal holds descriptions and Mod ID editing, keeping both library cards and selected rows compact.

**Key Characteristics:**
- Graphite layers, thin borders, softly rounded panels, and restrained shadows.
- A compact Geist hierarchy with monospace IDs and quiet blue interaction states.
- Thumbnail-led cards, direct selection controls, and focused modal editing.

Authority is the user's requested refinement, not an approved comp or QUALITY BAR. Sources: `PRODUCT.md`, `public/index.html`, `public/styles.css`, and `public/app.js`. Current captures: `.impeccable/review/desktop.png`, `mobile.png`, `user-800.png`, `modal-desktop.png`, and `modal-mobile.png`. Current source supersedes the earlier steel-blue system and expanded editors.

## Colors

The palette is near-black graphite with a pale blue action accent; amber and rose communicate review and error states.

- **Primary:** `accent` identifies actions, links, selection, save feedback, and keyboard focus. `accent-hover` brightens actions; `accent-ink` provides dark text on accent fills.
- **Neutral:** `ground` is the page; `surface` contains panels and cards; `raised` supports secondary buttons, active tabs, and hover states. `field` recesses inputs. `line` divides content; `line-strong` defines editable controls. `ink` and `muted` separate content from supporting text.
- **State:** `selected` tints selected checkbox rows and suggestion chips. `warn` accompanies missing IDs, variant review, and setup guidance; `danger` accompanies request errors. Disabled actions retain legible labels on muted graphite fills.

**The Visible State Rule.** Pair state color with text, a checkbox, a border, or a pressed/selected state; preserve the existing non-color cue.

## Typography

Geist is the interface face; Segoe UI and system sans-serif are fallbacks. The local Latin variable font is declared for weights 400–700, preloaded, and uses `font-display: swap`. IDs and server values use the monospace stack in `output`.

The frontmatter records the desktop anchors, not a modular display scale. Page headlines reduce to 24px on mobile. Section headings use 15–16px; modal titles use 20px, then 17px on mobile. Card titles use the `card-title` role, reducing to 12px on mobile. Labels and helpers use 10–12px with medium or semibold emphasis; description text uses 12px with a 1.7 line-height.

Card titles clamp to two lines; selected-row titles truncate to one line. The modal exposes the full wrapping title and description. Counts use tabular numerals. Search, import, result-filter, and Mod ID text inputs use 16px at widths up to 620px. Long IDs wrap in editing contexts; readonly outputs scroll horizontally.

## Layout

- The page is centered within 1464px, with 28px desktop gutters and a 64px header. The workspace pairs a flexible library with a 326px loadout and a 24px gap. At 1180px and below, the loadout becomes 308px and the gap becomes 20px.
- Library cards use an auto-fill grid with a 200px minimum and 12px gaps. At 900px and below, the workspace stacks and cards use three columns. At 620px and below, cards use two columns with 10px gaps; at 360px and below, one column.
- At 900px and below, the loadout becomes static and the selection-count link becomes a fixed, safe-area-aware jump near the bottom right. Page bottom padding reserves space for it. The selected list scrolls within 230px on desktop and 300px in the stacked layout.
- At 620px and below, gutters become 16px, search wraps, import actions stack, the result filter spans its own row, and help becomes one column. At 360px and below, gutters become 12px. Desktop loadouts stick 20px from the top, except at heights of 800px or less above the 900px width breakpoint.
- The modal caps its width at 820px and height at the smaller of 760px or the viewport minus 48px. Its header and footer sit outside the scrollable content. Desktop content places the description on the left and a 275px editor on the right. The DOM places the editor first. At 620px and below, a single-column layout follows that DOM order, with 12px viewport clearance and the editor above the description.

**The Compact Detail Rule.** Open descriptions and Mod ID editing in the shared modal; keep library cards and selected rows compact.

**The Exports First Rule.** Keep both labeled outputs and their copy actions above the selected-mod list within the loadout.

## Elevation & Depth

Tonal layers and thin borders provide the primary hierarchy. Soft shadows lift selected tabs, image tags, the loadout, and the floating mobile jump. The modal uses the strongest diffuse shadow over a dark translucent backdrop; it does not blur the underlying workspace. Exact shadow values live in the sidecar.

Control state transitions use 160ms ease-out; card transitions use 180ms ease-out. The modal reveals over 180ms through opacity and a small clipped-edge change. Reduced-motion preference removes transitions, animations, and smooth anchor scrolling.

## Shapes

The recurring corner vocabulary is compact controls, medium fields/buttons, and softly rounded panels, as recorded in frontmatter. Cards and the modal have their own related silhouettes rather than sharing one universal radius. Borders are generally 1px. Keyboard focus uses a 2px accent outline with a 3px offset. Original line SVG icons use rounded caps and joins with a 1.7 stroke width; the default size is 18px, with smaller icons inside compact controls.

## Components

- **Buttons:** Primary actions use the pale blue fill; secondary actions use bordered raised graphite. Filled buttons have a 40px minimum height; copy actions use 36px and 11px text. Text actions underline on hover. Named icon controls use 28px minimum width and 30px height; selected-row controls grow to 34px square in the stacked workspace. Preserve hover, focus, active, and disabled states.
- **Finder and fields:** Search/import tabs form an inset segmented control, with a filled, bordered selected tab and a blue icon. Preserve `aria-selected`, roving focus, arrow keys, Home, and End. Fields have recessed fills, stronger borders, and visible focus. Output fields remain readonly, selectable, single-line monospace inputs. Textareas resize vertically; the modal editor is height-bounded.
- **Workshop cards:** Inset 16:9 thumbnails use runtime Steam artwork, with the original box SVG beneath missing or failed images. Titles link to Steam. Build tags report metadata. A labeled checkbox changes between “Add to loadout” and “In your loadout”; selected cards gain a tinted fill, stronger border, and selected checkbox row. “Details & Mod IDs” is a button with `aria-haspopup="dialog"`, not an inline disclosure.
- **Selected rows:** An ordered, scrollable list preserves export order. The title/status button opens the same modal. Move up, move down, and remove remain directly available with item-specific accessible names; impossible moves are disabled. Reordering restores focus to the moved row. Clear exposes Undo, and browser persistence has a visible status line.
- **Details & Mod IDs modal:** A labeled native `dialog` opens with `showModal()`. Close receives initial focus; Tab and Shift+Tab loop through visible enabled controls. Escape, Close, Done, and backdrop clicks dismiss it. Focus returns to the opener or its replacement after a list rerender. The page is scroll-locked while open. Keep editor-first DOM order so mobile reading and keyboard order agree. Suggested ID chips use `aria-pressed`; manual edits to selected items save automatically. Unselected edits remain dialog drafts and apply when Add to loadout is pressed; closing does not persist those drafts. Inline validation and save status explain the result. A failed description lookup leaves saved IDs editable and the Steam link available.
- **Exports:** Keep Hostinger labels and order: Load Mods (`Mods`), then Install Workshop Items (`WorkshopItems`). Each value stays on one semicolon-separated line. The server-build selector is separate from the search filter. Build 41 uses plain Mod IDs; Build 42 prefixes each ID with one `\`. Load Mods uses the secondary copy action and requires a chosen build plus valid enabled IDs for every selection. Install Workshop Items uses the primary action and only requires selected items. Copy feedback names the destination field; clipboard failure selects the value for manual copying.
- **Feedback:** Inline polite live regions report requests, copying, and modal save state. Loading changes button labels, disables request actions, and marks results busy. Empty results offer the real SpiffBoy import; filtered no-results text explains recovery. Import notes remain expandable.
- **Assets:** Icons in `public/index.html` and `public/favicon.svg` are originally authored SVGs. Real Steam thumbnails are external runtime content; no shipping rasters are bundled. Review captures are evidence, not UI assets. Local Geist lives at `public/fonts/geist-latin.woff2`, sourced from Google Fonts at `https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwcGFU.woff2`; its license is `public/fonts/OFL.txt`.

## Do's and Don'ts

### Do:
- Do preserve the compact graphite library, local Geist typography, and quiet blue actions.
- Do keep Workshop IDs and Mod IDs separately labeled and independently copyable.
- Do keep the modal editor first in the DOM and first visually on mobile.
- Do preserve build-aware export formatting and the explanation beside the server-build selector.
- Do retain visible keyboard focus, named controls, focus restoration, and textual state feedback.

### Don't:
- Don't expand cards or selected rows into description and ID editors.
- Don't move the selected-mod list above the export actions.
- Don't use the search build filter or thumbnail tags as the server-build choice.
- Don't present suggested Mod IDs or build tags as verified compatibility.
- Don't turn runtime Steam thumbnails into bundled identity assets.
