export const APP_ID = 108600;
export const MAX_ITEMS = 300;

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function workshopId(value) {
  const text = String(value ?? '');
  if (!/^\d{1,20}$/.test(text) || BigInt(text) < 1n || BigInt(text) > 18446744073709551615n) {
    throw new RequestError('Use a numeric Workshop ID or a steamcommunity.com Workshop link.');
  }
  return BigInt(text).toString();
}

export function parseInput(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new RequestError('Paste at least one Workshop link, ID, or public collection.');
  }
  if (input.length > 12000) throw new RequestError('That input is too long. Import up to 100 links or IDs at a time.');
  const tokens = input.replace(/^\s*WorkshopItems\s*=/i, '').trim().split(/[\s,;]+/).filter(Boolean);
  if (tokens.length > 100) throw new RequestError('Import up to 100 links or IDs at a time.');
  const ids = tokens.map(token => {
    if (/^\d+$/.test(token)) return workshopId(token);
    let url;
    try { url = new URL(token); } catch { throw new RequestError(`Could not read “${token.slice(0,80)}”. Paste a Workshop link or numeric ID.`); }
    if (!['http:', 'https:'].includes(url.protocol) || !['steamcommunity.com', 'www.steamcommunity.com'].includes(url.hostname)
      || !/^\/(sharedfiles|workshop)\/filedetails\/?$/.test(url.pathname) || url.username || url.password || url.port) {
      throw new RequestError('Only steamcommunity.com Workshop item and collection links are supported.');
    }
    return workshopId(url.searchParams.get('id'));
  });
  return [...new Set(ids)];
}

export function plainDescription(description = '') {
  return String(description)
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, '')
    .replace(/\[\/?(?:h[1-6]|list|olist|li|tr|p|quote)(?:=[^\]]*)?\]/gi, '\n')
    .replace(/\[\*\]/g, '\n')
    .replace(/\[\/?(?:b|i|u|s|strike|url|code|table|td|spoiler)(?:=[^\]]*)?\]/gi, '')
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" })[entity])
    .replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function extractModIds(description) {
  const found = [];
  for (const match of plainDescription(description).matchAll(/^[\t ]*Mod[\t ]+IDs?[\t ]*:[\t ]*([^\n]*)/gim)) {
    const value = match[1].split(/Workshop\s+ID\s*:/i)[0];
    for (const part of value.split(/[;,|]/)) {
      const id = part.trim().replace(/^[`"']+|[`"']+$/g, '');
      // shortcut: descriptions only suggest IDs; the UI requires a choice for variants and accepts corrections.
      if (id && id.length <= 160 && !/[<>\[\]\r\n]/.test(id) && !/https?:\/\//i.test(id)) found.push(id);
    }
  }
  return [...new Set(found)];
}

function previewUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && /(^|\.)(steamusercontent\.com|steamstatic\.com)$/.test(url.hostname)) return url.href;
    if (url.protocol === 'https:' && url.hostname === 'steamuserimages-a.akamaihd.net') return url.href;
  } catch { /* A thumbnail is optional. */ }
  return '';
}

export function normalizeItem(item) {
  const description = plainDescription(item.description ?? item.file_description ?? '');
  return {
    id: workshopId(item.publishedfileid),
    title: String(item.title || 'Untitled Workshop item').slice(0, 300),
    image: previewUrl(item.preview_url),
    description: description.slice(0, 16000),
    modIds: extractModIds(description),
    tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag.tag ?? '')).filter(Boolean).slice(0, 30) : [],
    updated: Number(item.time_updated) || 0,
  };
}

function chunks(values, size = 100) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, (i + 1) * size));
}

function idParams(ids, field) {
  const params = { [field]: String(ids.length) };
  ids.forEach((id, i) => { params[`publishedfileids[${i}]`] = id; });
  return params;
}

export async function steamRequest(method, params, signal) {
  const authenticated = method === 'QueryFiles' || method === 'GetDetails';
  const endpoint = authenticated ? 'IPublishedFileService' : 'ISteamRemoteStorage';
  const url = new URL(`https://api.steampowered.com/${endpoint}/${method}/v1/`);
  const body = new URLSearchParams(params);
  if (authenticated) url.search = body.toString();
  let response;
  try {
    response = await fetch(url, {
      method: authenticated ? 'GET' : 'POST',
      headers: authenticated ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: authenticated ? undefined : body,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
    });
  } catch {
    throw new RequestError('Steam did not respond in time. Try again in a moment, or import a smaller collection.', 504);
  }
  if (response.status === 401 || response.status === 403) {
    throw new RequestError(authenticated ? `Steam rejected the ${method === 'QueryFiles' ? 'search' : 'dependency lookup'} API key. Check STEAM_WEB_API_KEY on the server.` : 'Steam denied this lookup. Check that the item or collection is public.', 502);
  }
  if (response.status === 429) throw new RequestError('Steam is limiting requests. Wait a minute, then try again.', 429);
  if (!response.ok) throw new RequestError('Steam is temporarily unavailable. Try again in a moment.', 502);
  let payload;
  try { payload = await response.json(); } catch { throw new RequestError('Steam returned an unreadable response. Try again.', 502); }
  if (!payload.response || typeof payload.response !== 'object') throw new RequestError('Steam returned an unexpected response. Try again.', 502);
  return payload.response;
}

async function getItems(ids, request, signal) {
  const batches = await Promise.all(chunks(ids).map(batch => request('GetPublishedFileDetails', idParams(batch, 'itemcount'), signal)));
  const details = new Map(batches.flatMap(batch => batch.publishedfiledetails ?? []).map(item => [String(item.publishedfileid), item]));
  const items = [];
  const warnings = [];
  for (const id of ids) {
    const item = details.get(id);
    if (!item || item.result !== 1 || item.banned || (item.visibility != null && ![0, 3].includes(item.visibility))) {
      warnings.push(`Workshop item ${id} is unavailable, private, or removed.`);
    } else if (Number(item.consumer_app_id) !== APP_ID) {
      warnings.push(`Skipped ${id}: it is not a Project Zomboid item.`);
    } else {
      items.push(normalizeItem(item));
    }
  }
  return { items, warnings };
}

export async function importItems(input, request = steamRequest, signal) {
  const roots = parseInput(input);
  const collections = new Map();
  let pending = roots;
  let collectionCount = 0;
  for (let depth = 0; pending.length; depth++) {
    if (depth > 4) throw new RequestError('This collection is nested too deeply. Import its smaller collections separately.');
    const batches = await Promise.all(chunks(pending).map(batch => request('GetCollectionDetails', idParams(batch, 'collectioncount'), signal)));
    const next = new Set();
    for (const detail of batches.flatMap(batch => batch.collectiondetails ?? [])) {
      const id = workshopId(detail.publishedfileid);
      if (detail.result !== 1) continue;
      if (detail.children != null && !Array.isArray(detail.children)) throw new RequestError('Steam returned an unreadable collection. Try again.', 502);
      if (++collectionCount > 30) throw new RequestError('Import a smaller collection containing no more than 30 nested collections.');
      const children = (detail.children ?? []).map(child => ({ id: workshopId(child.publishedfileid), collection: child.filetype === 2 }));
      if (children.length > MAX_ITEMS) throw new RequestError(`This collection has more than ${MAX_ITEMS} entries. Import a smaller collection.`);
      collections.set(id, children);
      for (const child of children) if (child.collection && !collections.has(child.id)) next.add(child.id);
    }
    pending = [...next].filter(id => !collections.has(id));
  }

  const ids = new Set();
  const visited = new Set();
  const warnings = [];
  function expand(id) {
    if (visited.has(id)) return;
    visited.add(id);
    if (collections.has(id)) {
      const children = collections.get(id);
      if (!children.length) warnings.push(`Collection ${id} is empty.`);
      for (const child of children) {
        if (child.collection && !collections.has(child.id)) warnings.push(`Nested collection ${child.id} is unavailable.`);
        else expand(child.id);
      }
    } else {
      ids.add(id);
      if (ids.size > MAX_ITEMS) throw new RequestError(`Import up to ${MAX_ITEMS} unique mods at a time. Use a smaller collection.`);
    }
  }
  roots.forEach(expand);
  const result = await getItems([...ids], request, signal);
  return { ...result, warnings: [...warnings, ...result.warnings], collections: collections.size };
}

export async function getRequirements({ id, key }, request = steamRequest, signal) {
  const root = workshopId(id);
  if (!key) throw new RequestError('Dependency lookup needs STEAM_WEB_API_KEY on the server. You can still check dependencies on Steam and import them manually.', 503);
  const seen = new Set([root]);
  const direct = new Set();
  const requirements = [];
  let pending = [root];
  while (pending.length) {
    const batches = await Promise.all(chunks(pending).map(batch => request('GetDetails', {
      key, input_json: JSON.stringify({ publishedfileids: batch, includechildren: true, includetags: true }),
    }, signal)));
    if (batches.some(batch => !Array.isArray(batch.publishedfiledetails) || (batch.result != null && batch.result !== 1))) {
      throw new RequestError('Steam returned unreadable dependencies. Try again.', 502);
    }
    const details = new Map(batches.flatMap(batch => batch.publishedfiledetails).map(item => [String(item.publishedfileid), item]));
    const next = [];
    for (const current of pending) {
      const item = details.get(current);
      const reason = !item || item.result !== 1 || item.banned || (item.visibility != null && ![0, 3].includes(item.visibility))
        ? 'Unavailable, private, removed, or banned.'
        : Number(item.consumer_appid ?? item.consumer_app_id) !== APP_ID ? 'Not a Project Zomboid item.'
        : Number(item.file_type ?? 0) !== 0 ? 'Not a mod; this item cannot be added as a dependency.' : '';
      if (reason) {
        if (current === root) throw new RequestError(`Cannot check dependencies for this Workshop item. ${reason}`, 404);
        requirements.push({ id: current, title: String(item?.title || `Workshop item ${current}`).slice(0, 300), available: false, direct: direct.has(current), reason });
        continue;
      }
      if ((item.children != null && !Array.isArray(item.children)) || Number(item.num_children) > (item.children ?? []).length) {
        throw new RequestError('Steam returned incomplete dependencies. Try again or check the Workshop page.', 502);
      }
      let children;
      try { children = (item.children ?? []).map(child => workshopId(child.publishedfileid)); }
      catch { throw new RequestError('Steam returned an unreadable dependency ID. Try again.', 502); }
      if (current === root) children.forEach(child => direct.add(child));
      else requirements.push({ ...normalizeItem(item), available: true, direct: direct.has(current) });
      for (const child of children) {
        if (seen.has(child)) continue;
        seen.add(child);
        if (seen.size > MAX_ITEMS) throw new RequestError(`These dependencies exceed ${MAX_ITEMS} Workshop items including the original mod. Review dependencies on Steam.`);
        next.push(child);
      }
    }
    pending = next;
  }
  return { requirements };
}

export async function searchItems({ query = '', page = 1, build = '', key }, request = steamRequest, signal) {
  if (!key) throw new RequestError('Workshop search needs STEAM_WEB_API_KEY on the server. You can still import links, IDs, or collections.', 503);
  if (typeof query !== 'string' || query.length > 120) throw new RequestError('Keep your search under 120 characters.');
  if (!Number.isInteger(page) || page < 1 || page > 1000) throw new RequestError('Choose a page between 1 and 1000.');
  if (!['', 'Build 41', 'Build 42'].includes(build)) throw new RequestError('Choose a supported game build.');
  const params = {
    appid: APP_ID, search_text: query.trim(), query_type: query.trim() ? 12 : 9,
    page, numperpage: 24, filetype: 0, ids_only: true,
    requiredtags: build ? [build] : [], match_all_tags: true,
  };
  const data = await request('QueryFiles', { key, input_json: JSON.stringify(params) }, signal);
  if (data.result != null && data.result !== 1) throw new RequestError('Steam could not complete this search. Check the API key and try again.', 502);
  const ids = [...new Set((data.publishedfiledetails ?? []).map(item => workshopId(item.publishedfileid)))];
  const result = await getItems(ids, request, signal);
  return { ...result, page, total: Number(data.total) || 0, hasMore: page * 24 < Number(data.total) };
}
