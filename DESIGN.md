---
name: Zomboid Loadout
description: A dark, Steam-like Workshop library with a separate, editable server loadout.
colors:
  ground: "#141e2b"
  surface: "#1b2939"
  field: "#121d2b"
  line: "#35485e"
  ink: "#eef3f9"
  muted: "#afbed0"
  accent: "#87cef5"
  accent-hover: "#b3e3ff"
  accent-ink: "#102435"
  warn: "#eac793"
  danger: "#ffb6b1"
  secondary: "#2a4058"
  secondary-hover: "#385471"
  disabled-background: "#26364a"
  disabled-text: "#9aadc2"
typography:
  body:
    fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  title:
    fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-.01em"
  label:
    fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.55
  output:
    fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  badge: "3px"
  control: "4px"
  panel: "6px"
spacing:
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "22": "22px"
  "24": "24px"
  "32": "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    padding: "8px 0"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    height: "32px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
  tab-selected:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    padding: "18px 0 16px"
  suggestion:
    backgroundColor: "#283e55"
    textColor: "{colors.ink}"
    rounded: "{rounded.badge}"
    padding: "5px 7px"
  mod-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
---

# Design System: Zomboid Loadout

## Overview

**Creative North Star: "Steam-like mod library"**

Dark steel panels, cool blue actions, thumbnail-led content, and plain UI typography preserve the user's pinned Steam-like utility. Compact controls keep discovery, selection, and export readable.

Borders and tonal layers establish hierarchy. Selection marks, nearby explanatory text, and inline status messages communicate state without interrupting the workspace.

**Key Characteristics:**
- Dense, bordered dark panels with restrained corners.
- Blue actions and selection; amber review notes and rose errors.
- Separate discovery and loadout areas, with exports before selected-item editors.

Authority is the user-pinned Steam-like UI, not an approved comp or catalog QUALITY BAR card. Sources: `PRODUCT.md`, the direction contract in `public/index.html`, `public/styles.css`, `public/app.js`, and `public/format.js`. Visual evidence: `.impeccable/review/desktop.png`, `mobile.png`, and `user-1000.png`. Current source takes precedence over older review measurements.

## Colors

The palette uses blue-gray neutrals with one cool action accent; warning and error colors identify specific states.

- **Primary:** `accent` marks primary buttons, links, selected borders, active tabs, output values, and keyboard focus. `accent-hover` brightens interactive targets; `accent-ink` supplies dark text on blue fills.
- **Secondary:** `secondary` and `secondary-hover` distinguish supporting actions, including copying Mod IDs. `warn` marks missing IDs, variant review, setup guidance, and import notes; `danger` marks request errors.
- **Neutral:** `ground` is the page; `surface` holds panels and cards; `field` recesses inputs. `line` separates content. `ink` and `muted` distinguish primary content from helper text. Disabled filled buttons use the dedicated disabled pair.

**The Visible State Rule.** Pair state color with text, a checkbox, an underline, or a border; preserve the existing non-color cue.

## Typography

Use the plain UI stack for controls and content, and the monospace stack for IDs and configuration values. The title, body, label, and output roles above are the recurring anchors; this is a compact hierarchy, not a modular display scale.

Card titles use semibold text (14px, weight 600, line-height 1.45). Supporting copy uses 12–13px; compact metadata uses 11px. Counts use tabular numerals. At widths up to 620px, search, import, filter, and Mod ID editor text inputs use 16px. Long titles and IDs wrap rather than widen their containers.

## Layout

- The page has a maximum width of 1440px and desktop horizontal padding of 32px. Search/import and results occupy the flexible left column; the loadout occupies the right column.
- Above 1200px, the loadout is 350px wide with a 28px gap; at 1400px and above, it is 370px with a 32px gap. Between 901px and 1200px, it is 330px with a 22px gap.
- At 900px and below, the workspace stacks, the loadout becomes static, and the selection-count link provides a jump to it. The stacked workspace gap is 30px.
- Cards use three columns by default, two at 1200px and below, three again in the stacked layout, two at 620px and below, and one at 380px and below. Card gaps are 16px, then 12px at the 620px breakpoint.
- At 620px and below, page gutters become 20px, import actions stack, help becomes one column, and the header drops its first help link. Gutters become 14px at 380px and below.
- Desktop loadouts normally stick 24px from the top. Selected items scroll within `clamp(100px, calc(100dvh - 800px), 240px)`; stacked layouts allow 400px.
- At widths of at least 901px and heights of at most 800px, the loadout becomes static. Reduced export spacing and 42px output fields keep copy actions ahead of the selected-item list. This is the short-height desktop treatment, not a guarantee for every viewport or expanded warning state.

**The Exports First Rule.** Keep both labeled outputs and their copy actions above the selected-item editors within the loadout.

## Elevation & Depth

Depth comes from dark tonal layers and thin borders, with no box shadows. Inputs are darker than panels; selected cards gain an accent border and tinted selection row. Motion is limited to filled-button background and border transitions (140ms ease-out) and smooth anchor scrolling. Reduced-motion preference removes transitions and smooth scrolling.

## Shapes

Panels and cards use the panel radius; fields and buttons use the control radius; build tags and suggestion chips use the badge radius. Borders are generally 1px. The active tab has a 2px underline. Keyboard focus uses a 2px accent outline with a 4px offset. Original line SVG icons use rounded caps and joins; common icons are 20px with a 1.7 stroke width.

## Components

- **Buttons:** Filled primary and secondary actions use 14px text at weight 650 and a 44px minimum height. Text actions remain blue on transparent backgrounds; hover adds an underline. Icon actions expose accessible labels, use 32px controls, and gain a tinted hover background. Disabled states retain their labels.
- **Fields and tabs:** Inputs have dark fills, visible borders, labels, and adjacent help. Search/import tabs use `aria-selected`, roving focus, arrow keys, Home, and End. Active tabs retain their underline. Outputs are readonly, selectable, monospace textareas; other textareas remain vertically resizable.
- **Workshop cards:** Runtime Steam thumbnails fill a clipped frame (16:10 by default, 1.3 at 620px and below, 16:9 at 380px and below). A box SVG remains when an image is absent or fails. Titles link to Steam; build tags describe metadata. A labeled checkbox changes between “Add to loadout” and “In your loadout.” Native details reveal descriptions and IDs.
- **Loadout and exports:** Server build is a separate choice from the search build filter. Workshop IDs use the primary copy action; Mod IDs use the secondary action. Build 41 emits plain Mod IDs; Build 42 adds one leading `\` to each ID. Mod ID copying stays disabled until a build is chosen and every selected item has valid enabled IDs. Workshop copying remains available when selections exist. Build hints and missing-ID notes explain the state.
- **Selected-item editors:** Native details contain editable IDs, suggestion chips with `aria-pressed`, and named reorder/remove buttons. An ordered, scrollable list preserves export order. Clear exposes Undo; browser persistence has a visible status line.
- **Feedback:** Empty results offer a real example import; filtered no-results text explains recovery. Loading changes button labels, disables request actions, and marks results busy. Inline status and copy feedback use polite live regions. Clipboard failure selects the output and explains manual copying. Import warnings remain expandable.
- **Assets:** Shipping identity assets are the original inline SVG icons in `public/index.html` and `public/favicon.svg`. Steam thumbnails are external content fetched at runtime. There are no bundled shipping raster files; review screenshots are evidence, not UI assets.

## Do's and Don'ts

### Do:
- Do preserve the dark Steam-like utility, plain UI type, and visible panel boundaries.
- Do keep Workshop IDs and Mod IDs separately labeled and independently copyable.
- Do preserve build-aware Mod ID formatting and the explanation beside its selector.
- Do retain the stacked layout and short-height desktop treatment when extending the workspace.
- Do retain visible keyboard focus, labeled controls, and textual state feedback.

### Don't:
- Don't move selected-item editors above the export actions.
- Don't use the search build filter or thumbnail tags as the server-build choice.
- Don't present suggested Mod IDs or build tags as verified compatibility.
- Don't turn runtime Steam thumbnails into bundled identity assets.
