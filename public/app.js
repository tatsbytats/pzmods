import { formatModIds } from './format.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'zomboid-loadout:v1';
const BUILD_KEY = 'zomboid-loadout:server-build';
const MAX_ITEMS = 300;
const selected = new Map();
let results = [];
let busy = false;
let mode = 'search';
let page = 1;
let searchQuery = '';
let searchBuild = '';
let previousSelection = null;
let serverBuild = '';

function element(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(svg.namespaceURI, 'use');
  use.setAttribute('href', `#icon-${name}`);
  svg.append(use);
  return svg;
}

function steamLink(id, title) {
  const link = element('a', '', title);
  link.href = `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function parseModIds(value) {
  return [...new Set(value.split(/[;\r\n]+/).map(id => id.trim()).filter(Boolean))];
}

function validModIds(ids) {
  return Array.isArray(ids) && ids.length <= 100 && ids.every(id => typeof id === 'string' && id.replace(/^\\+/, '').trim().length > 0 && id.length <= 160 && !/[;\r\n\u0000]/.test(id));
}

function storageIssue(text) {
  $('storage-note').replaceChildren(icon('info'), element('span', '', text));
}

try {
  const savedBuild = localStorage.getItem(BUILD_KEY);
  serverBuild = ['41', '42'].includes(savedBuild) ? savedBuild : '';
  $('server-build').value = serverBuild;
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (!Array.isArray(saved) || saved.length > MAX_ITEMS) throw new Error('Invalid saved selection');
  for (const mod of saved) {
    if (!mod || typeof mod.id !== 'string' || !/^\d{1,20}$/.test(mod.id) || typeof mod.title !== 'string' || mod.title.length > 300 || !validModIds(mod.modIds) || !validModIds(mod.enabledIds)) throw new Error('Invalid saved mod');
    selected.set(mod.id, mod);
  }
} catch {
  selected.clear();
  storageIssue('Saved list unavailable. You can still use this tab.');
}

function persist() {
  try {
    const saved = [...selected.values()].map(({ id, title, modIds, enabledIds }) => ({ id, title, modIds, enabledIds: validModIds(enabledIds) ? enabledIds : [] }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    localStorage.setItem(BUILD_KEY, serverBuild);
  } catch { storageIssue('Could not save locally. Keep this tab open.'); }
}

function message(text = '', type = '') {
  $('message').textContent = text;
  $('message').className = `message ${type}`;
  $('message').hidden = !text;
}

function setBusy(value) {
  busy = value;
  $('search-button').disabled = value;
  $('import-button').disabled = value;
  $('example-button').disabled = value;
  $('search-button').textContent = value && mode === 'search' ? 'Searching…' : 'Search';
  $('import-button').textContent = value && mode === 'import' ? 'Loading…' : 'Load mods';
  $('results').setAttribute('aria-busy', String(value));
  $('previous-page').disabled = value || page <= 1;
  $('next-page').disabled = value || $('next-page').dataset.hasMore !== 'true';
}

async function api(url, options) {
  let response;
  try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(29000) }); }
  catch { throw new Error('Could not reach the server. Check your connection and try again.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('The server returned an unreadable response. Try again.'); }
  if (!response.ok) throw new Error(data.error || 'The request failed. Please try again.');
  return data;
}

function switchTab(tab) {
  for (const name of ['search', 'import']) {
    const active = name === tab;
    $(`${name}-tab`).setAttribute('aria-selected', String(active));
    $(`${name}-tab`).tabIndex = active ? 0 : -1;
    $(`${name}-panel`).hidden = !active;
  }
}

for (const name of ['search', 'import']) {
  $(`${name}-tab`).addEventListener('click', () => switchTab(name));
  $(`${name}-tab`).addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 'search' : event.key === 'End' ? 'import' : name === 'search' ? 'import' : 'search';
    switchTab(target);
    $(`${target}-tab`).focus();
  });
}
$('setup-import').addEventListener('click', () => { switchTab('import'); $('import-input').focus(); });

function showWarnings(warnings) {
  $('import-warnings').hidden = !warnings.length;
  $('warnings-summary').textContent = `${warnings.length} import ${warnings.length === 1 ? 'note' : 'notes'} — some items need attention`;
  $('warnings-list').replaceChildren(...warnings.map(warning => element('li', '', warning)));
}

function visibleResults() {
  const filter = $('result-filter').value.trim().toLocaleLowerCase();
  return results.filter(mod => !filter || mod.title.toLocaleLowerCase().includes(filter) || mod.id.includes(filter) || mod.modIds.some(id => id.toLocaleLowerCase().includes(filter)));
}

function addMod(mod) {
  if (selected.has(mod.id)) return true;
  if (selected.size >= MAX_ITEMS) { message(`A loadout can hold ${MAX_ITEMS} Workshop items. Remove an item before adding another.`, 'error'); return false; }
  selected.set(mod.id, { ...mod, enabledIds: mod.modIds.length === 1 ? [...mod.modIds] : [] });
  previousSelection = null;
  $('undo-row').hidden = true;
  return true;
}

function syncCards() {
  for (const card of $('results').children) {
    if (!card.dataset.id) continue;
    const checked = selected.has(card.dataset.id);
    card.classList.toggle('is-selected', checked);
    card.querySelector('input[type="checkbox"]').checked = checked;
    card.querySelector('.select-label').textContent = checked ? 'In your loadout' : 'Add to loadout';
  }
}

function renderCard(mod) {
  const card = element('article', `mod-card${selected.has(mod.id) ? ' is-selected' : ''}`);
  card.dataset.id = mod.id;
  const thumbnail = element('div', 'thumbnail');
  thumbnail.append(icon('box'));
  if (mod.image) {
    const image = element('img');
    image.src = mod.image;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove(), { once: true });
    thumbnail.append(image);
  }
  const builds = mod.tags.filter(tag => /^Build \d+$/.test(tag));
  thumbnail.append(element('span', 'build-tag', builds.join(' / ') || 'Build not listed'));
  const body = element('div', 'mod-body');
  const title = element('h3');
  title.append(steamLink(mod.id, mod.title));
  body.append(title, element('p', 'workshop-id', `#${mod.id}`));
  body.append(element('p', `mod-hint${mod.modIds.length !== 1 ? ' needs-review' : ''}`, mod.modIds.length === 1 ? '1 Mod ID found' : mod.modIds.length ? `${mod.modIds.length} Mod IDs · choose variants` : 'Mod ID needs manual entry'));
  const details = element('details', 'mod-details');
  details.append(element('summary', '', 'Details & Mod IDs'));
  details.append(element('p', '', mod.description ? mod.description.slice(0, 800) + (mod.description.length > 800 ? '…' : '') : 'No description was provided. Open the Workshop page for details.'));
  if (mod.modIds.length) details.append(element('code', '', mod.modIds.join(';')));
  body.append(details);
  const label = element('label', 'select-mod');
  const checkbox = element('input');
  checkbox.type = 'checkbox';
  checkbox.checked = selected.has(mod.id);
  checkbox.setAttribute('aria-label', `Select ${mod.title}`);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) addMod(mod); else selected.delete(mod.id);
    persist(); renderSelection(); syncCards();
  });
  label.append(checkbox, element('span', 'select-label', selected.has(mod.id) ? 'In your loadout' : 'Add to loadout'));
  card.append(thumbnail, body, label);
  return card;
}

function renderResults() {
  const visible = visibleResults();
  $('results').replaceChildren(...visible.map(renderCard));
  if (results.length && !visible.length) $('results').append(element('p', 'no-results', 'No loaded mods match that filter. Try a different name or ID.'));
  $('select-shown').disabled = !visible.length;
  $('filter-row').hidden = results.length < 2;
  $('empty-state').hidden = results.length > 0;
  if (results.length) $('results-count').textContent = `${visible.length} of ${results.length} loaded mods · select the ones you want`;
}

function updateOutputs() {
  const mods = [...selected.values()];
  const missing = mods.filter(mod => !mod.enabledIds.length || !validModIds(mod.enabledIds)).length;
  $('selection-count').textContent = String(mods.length);
  $('jump-count').textContent = `${mods.length} selected`;
  $('selection-empty').hidden = mods.length > 0;
  $('clear-selection').disabled = !mods.length;
  $('workshop-output').value = mods.map(mod => mod.id).join(';');
  $('mods-output').value = formatModIds(mods.flatMap(mod => mod.enabledIds), serverBuild);
  $('copy-workshop').disabled = !mods.length;
  $('copy-mods').disabled = !mods.length || missing > 0 || !serverBuild;
  $('missing-note').hidden = !mods.length || (!missing && Boolean(serverBuild));
  $('missing-note').textContent = missing
    ? `${missing} ${missing === 1 ? 'item needs' : 'items need'} Mod IDs. Expand the selected ${missing === 1 ? 'mod' : 'mods'} to choose variants or enter IDs. Workshop IDs are still ready to copy.`
    : 'Choose your server build below to format and copy Mod IDs.';
  $('build-hint').textContent = serverBuild === '42' ? 'Build 42 adds a leading \\ to each Mod ID.' : serverBuild === '41' ? 'Build 41 uses plain Mod IDs, without a prefix.' : 'Match the build running on your game server.';
  $('copy-feedback').textContent = '';
}

function statusText(mod) {
  if (!validModIds(mod.enabledIds)) return 'Check Mod ID length or separators';
  return mod.enabledIds.length ? `${mod.enabledIds.length} Mod ${mod.enabledIds.length === 1 ? 'ID' : 'IDs'}` : mod.modIds.length > 1 ? 'Choose Mod IDs' : 'Missing Mod ID';
}

function moveMod(id, offset) {
  const entries = [...selected.entries()];
  const index = entries.findIndex(([key]) => key === id);
  const next = index + offset;
  if (next < 0 || next >= entries.length) return;
  [entries[index], entries[next]] = [entries[next], entries[index]];
  selected.clear(); entries.forEach(([key, value]) => selected.set(key, value));
  persist(); renderSelection();
  const moved = document.querySelector(`[data-selected-id="${id}"] summary`);
  moved?.focus();
}

function iconButton(name, label, action) {
  const button = element('button', 'icon-button');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(icon(name));
  button.addEventListener('click', action);
  return button;
}

function renderSelection() {
  const openIds = new Set([...$('selected-list').querySelectorAll('details[open]')].map(details => details.closest('li').dataset.selectedId));
  const entries = [...selected.values()];
  $('selected-list').replaceChildren(...entries.map((mod, index) => {
    const li = element('li', 'selected-item');
    li.dataset.selectedId = mod.id;
    const details = element('details');
    details.open = openIds.has(mod.id);
    const summary = element('summary', '', mod.title);
    const status = element('span', `id-status${!mod.enabledIds.length ? ' needs-review' : ''}`, statusText(mod));
    summary.append(status);
    const editor = element('div', 'mod-editor');
    const label = element('label', '', 'Enabled Mod IDs');
    label.htmlFor = `mod-ids-${mod.id}`;
    const input = element('textarea');
    input.id = label.htmlFor;
    input.rows = 2;
    input.maxLength = 8000;
    input.placeholder = 'Enter IDs separated by semicolons';
    input.spellcheck = false;
    input.value = mod.enabledIds.join(';');
    const suggestions = element('div', 'suggestions');
    function changed() {
      mod.enabledIds = parseModIds(input.value);
      status.textContent = statusText(mod);
      status.classList.toggle('needs-review', !mod.enabledIds.length || !validModIds(mod.enabledIds));
      for (const button of suggestions.children) button.setAttribute('aria-pressed', String(mod.enabledIds.includes(button.textContent)));
      persist(); updateOutputs();
    }
    input.addEventListener('input', changed);
    editor.append(label, input, element('p', 'editor-help', mod.modIds.length > 1 ? 'Choose only the variants you need. These suggestions come from the description.' : 'Check the description or mod.info if this ID is missing or incorrect.'));
    for (const id of mod.modIds) {
      const button = element('button', 'suggestion', id);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(mod.enabledIds.includes(id)));
      button.addEventListener('click', () => { input.value = (mod.enabledIds.includes(id) ? mod.enabledIds.filter(value => value !== id) : [...mod.enabledIds, id]).join(';'); changed(); });
      suggestions.append(button);
    }
    editor.append(suggestions);
    const actions = element('div', 'editor-actions');
    const reorder = element('div');
    const up = iconButton('up', `Move ${mod.title} up`, () => moveMod(mod.id, -1));
    const down = iconButton('down', `Move ${mod.title} down`, () => moveMod(mod.id, 1));
    up.disabled = index === 0; down.disabled = index === entries.length - 1;
    reorder.append(up, down);
    actions.append(steamLink(mod.id, 'View on Steam'), reorder);
    editor.append(actions); details.append(summary, editor);
    const remove = iconButton('close', `Remove ${mod.title}`, () => {
      selected.delete(mod.id); persist(); renderSelection(); syncCards();
      const focusTarget = $('selected-list').querySelector('summary') || $('import-tab');
      focusTarget.focus();
    });
    li.append(details, remove);
    return li;
  }));
  updateOutputs();
}

async function loadImport(input) {
  if (busy) return;
  mode = 'import'; switchTab('import');
  setBusy(true); message('Reading Workshop items and collections…', 'loading'); showWarnings([]);
  try {
    const data = await api('/api/workshop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input }) });
    results = data.items;
    $('result-filter').value = '';
    $('pagination').hidden = true;
    $('results-heading').textContent = data.collections ? 'From your collection' : 'Imported mods';
    $('results-count').textContent = `${results.length} mods loaded`;
    renderResults(); showWarnings(data.warnings);
    message(results.length ? `${results.length} ${results.length === 1 ? 'mod loaded' : 'mods loaded'}. Choose what goes into your loadout.` : 'No available Project Zomboid mods were found. Check the import notes or try another link.');
  } catch (error) { message(error.message, 'error'); }
  finally { setBusy(false); }
}

async function loadSearch(nextPage = 1) {
  if (busy) return;
  mode = 'search'; setBusy(true); message('Searching the Project Zomboid Workshop…', 'loading'); showWarnings([]);
  try {
    const params = new URLSearchParams({ action: 'search', q: searchQuery, build: searchBuild, page: String(nextPage) });
    const data = await api(`/api/workshop?${params}`);
    page = data.page;
    results = data.items;
    $('result-filter').value = '';
    $('results-heading').textContent = searchQuery ? 'Workshop results' : 'Most subscribed mods';
    $('results-count').textContent = `${data.total.toLocaleString()} results on Steam`;
    $('pagination').hidden = page === 1 && !data.hasMore;
    $('page-label').textContent = `Page ${page}`;
    $('next-page').dataset.hasMore = String(data.hasMore);
    renderResults(); showWarnings(data.warnings);
    message(results.length ? '' : 'No mods matched. Try a shorter search or select All builds.');
  } catch (error) { message(error.message, 'error'); }
  finally { setBusy(false); }
}

$('import-form').addEventListener('submit', event => { event.preventDefault(); loadImport($('import-input').value); });
$('search-form').addEventListener('submit', event => { event.preventDefault(); if (busy) return; searchQuery = $('search-input').value; searchBuild = $('build-filter').value; loadSearch(); });
$('previous-page').addEventListener('click', () => loadSearch(page - 1));
$('next-page').addEventListener('click', () => loadSearch(page + 1));
$('result-filter').addEventListener('input', renderResults);
$('example-button').addEventListener('click', () => { $('import-input').value = '3825220364'; loadImport('3825220364'); });
$('select-shown').addEventListener('click', () => {
  for (const mod of visibleResults()) if (!addMod(mod)) break;
  persist(); renderSelection(); syncCards();
});
$('clear-selection').addEventListener('click', () => {
  previousSelection = [...selected.entries()];
  selected.clear(); persist(); renderSelection(); syncCards(); $('undo-row').hidden = false; $('undo-clear').focus();
});
$('undo-clear').addEventListener('click', () => {
  if (!previousSelection) return;
  selected.clear(); previousSelection.forEach(([id, mod]) => selected.set(id, mod));
  previousSelection = null; $('undo-row').hidden = true; persist(); renderSelection(); syncCards(); $('clear-selection').focus();
});

async function copyOutput(id, label) {
  const output = $(id);
  if (!output.value) return;
  try { await navigator.clipboard.writeText(output.value); $('copy-feedback').textContent = `${label} copied. Paste the value into Hostinger.`; }
  catch { output.focus(); output.select(); $('copy-feedback').textContent = 'Clipboard unavailable. The value is selected; press Ctrl+C or use Copy.'; }
}
$('copy-workshop').addEventListener('click', () => copyOutput('workshop-output', 'Workshop IDs'));
$('copy-mods').addEventListener('click', () => copyOutput('mods-output', 'Mod IDs'));
$('server-build').addEventListener('change', () => { serverBuild = $('server-build').value; persist(); updateOutputs(); });

renderSelection();
try {
  const config = await api('/api/workshop?action=config');
  $('search-setup').hidden = config.searchEnabled;
  if (config.searchEnabled) { searchQuery = ''; loadSearch(); }
  else { $('search-setup').open = true; }
} catch (error) { message(error.message, 'error'); }
