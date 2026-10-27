import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { parseInput, extractModIds, normalizeItem, importItems, searchItems, getRequirements, steamRequest } from '../lib/workshop.js';
import handler from '../api/workshop.js';
import { formatModIds } from '../public/format.js';

const item = (id, extra = {}) => ({ publishedfileid: id, result: 1, consumer_app_id: 108600, title: `Mod ${id}`, description: `Mod ID: mod${id}`, ...extra });
const requestIds = params => Object.entries(params).filter(([key]) => key.startsWith('publishedfileids[')).map(([, value]) => value);
const requiredItem = (id, children = [], extra = {}) => ({ publishedfileid: id, result: 1, consumer_appid: 108600, file_type: 0, title: `Mod ${id}`, file_description: `Mod ID: mod${id}`, num_children: children.length, children: children.map(child => ({ publishedfileid: child, file_type: 0 })), ...extra });

test('export format matches Build 41 or 42 without double prefixes or duplicate IDs', () => {
  assert.equal(formatModIds(['SpiffBoy', 'Other'], '42'), '\\SpiffBoy;\\Other');
  assert.equal(formatModIds(['SpiffBoy', 'Other'], '41'), 'SpiffBoy;Other');
  assert.equal(formatModIds(['SpiffBoy', '\\SpiffBoy', '\\\\Other'], '42'), '\\SpiffBoy;\\Other');
  assert.equal(formatModIds(['\\SpiffBoy'], '41'), 'SpiffBoy');
  assert.equal(formatModIds(['SpiffBoy'], ''), '');
  assert.throws(() => formatModIds(['SpiffBoy'], '43'), /Choose Build/);
});

test('input parser accepts Workshop URLs and delimited values without losing 64-bit IDs', () => {
  assert.deepEqual(parseInput('WorkshopItems=3825220364; 3825220364;18446744073709551615'), ['3825220364', '18446744073709551615']);
  assert.deepEqual(parseInput('https://steamcommunity.com/sharedfiles/filedetails/?id=123&searchtext=test\nhttps://steamcommunity.com/workshop/filedetails/?id=456,789;'), ['123', '456', '789']);
  for (const input of ['', '0', '1e10', '-5', '18446744073709551616', 'https://evil.test/?id=123', 'https://steamcommunity.com.evil.test/sharedfiles/filedetails/?id=1', 'https://user@steamcommunity.com/sharedfiles/filedetails/?id=1', 'https://steamcommunity.com/app/108600', 'https://steamcommunity.com/sharedfiles/filedetails/?id=abc']) {
    assert.throws(() => parseInput(input), { name: 'Error' }, input);
  }
  assert.throws(() => parseInput(Array.from({ length: 101 }, (_, i) => i + 1).join(';')), /100 links/);
});

test('Mod IDs come from explicit labels, not unrelated prose or the mod title', () => {
  assert.deepEqual(extractModIds('[b]Mod ID:[/b] SpiffBoy\nMod ID: SpiffBoy\nWorkshop ID: 3825220364'), ['SpiffBoy']);
  assert.deepEqual(extractModIds('Mod IDs: BaseMod; Option_A, Option_B\nMod ID: With Spaces\nMod ID: Other Workshop ID: 123'), ['BaseMod', 'Option_A', 'Option_B', 'With Spaces', 'Other']);
  assert.deepEqual(extractModIds('Mod ID:\nThis is not a mod ID.\nA great mod called BetterZombies'), []);
  assert.deepEqual(extractModIds('Mod ID: https://example.com/file\nMod ID: <script>bad</script>'), []);
});

test('normalization keeps IDs as strings and only accepts Steam thumbnail origins', () => {
  const result = normalizeItem(item('18446744073709551615', { preview_url: 'https://images.steamusercontent.com/ugc/123', description: '[img]https://example.test/a.jpg[/img][b]Mod ID:[/b] Example' }));
  assert.equal(result.id, '18446744073709551615');
  assert.equal(result.image, 'https://images.steamusercontent.com/ugc/123');
  assert.deepEqual(result.modIds, ['Example']);
  assert.equal(normalizeItem(item('1', { preview_url: 'javascript:alert(1)' })).image, '');
  assert.equal(normalizeItem(item('1', { preview_url: 'https://steamusercontent.com.evil.test/a' })).image, '');
});

test('collection import expands nested collections, deduplicates, breaks cycles, and filters other games', async () => {
  const collections = {
    '10': [{ publishedfileid: '1', filetype: 0 }, { publishedfileid: '20', filetype: 2 }, { publishedfileid: '2', filetype: 0 }],
    '20': [{ publishedfileid: '3', filetype: 0 }, { publishedfileid: '10', filetype: 2 }, { publishedfileid: '4', filetype: 0 }, { publishedfileid: '5', filetype: 0 }],
  };
  const request = async (method, params) => {
    const ids = requestIds(params);
    if (method === 'GetCollectionDetails') return { collectiondetails: ids.map(id => ({ publishedfileid: id, result: collections[id] ? 1 : 9, children: collections[id] })) };
    return { publishedfiledetails: ids.map(id => item(id, id === '4' ? { consumer_app_id: 730 } : id === '5' ? { result: 9 } : {})) };
  };
  const result = await importItems('10;1', request);
  assert.deepEqual(result.items.map(mod => mod.id), ['1', '3', '2']);
  assert.equal(result.collections, 2);
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings[0], /not a Project Zomboid item/);
  assert.match(result.warnings[1], /unavailable/);
});

test('unavailable nested collections do not become exported Workshop IDs', async () => {
  const request = async (method, params) => {
    const ids = requestIds(params);
    if (method === 'GetCollectionDetails') return { collectiondetails: ids.map(id => id === '10'
      ? { publishedfileid: id, result: 1, children: [{ publishedfileid: '20', filetype: 2 }, { publishedfileid: '1', filetype: 0 }] }
      : { publishedfileid: id, result: 9 }) };
    return { publishedfiledetails: ids.map(id => item(id)) };
  };
  const result = await importItems('10', request);
  assert.deepEqual(result.items.map(mod => mod.id), ['1']);
  assert.deepEqual(result.warnings, ['Nested collection 20 is unavailable.']);
});

test('oversized collections fail explicitly instead of silently truncating the loadout', async () => {
  const request = async () => ({ collectiondetails: [{ publishedfileid: '1000', result: 1, children: Array.from({ length: 301 }, (_, i) => ({ publishedfileid: String(i + 1), filetype: 0 })) }] });
  await assert.rejects(importItems('1000', request), /more than 300 entries/);
});

test('empty collections are not exported as if they were mods', async () => {
  const request = async method => {
    assert.equal(method, 'GetCollectionDetails');
    return { collectiondetails: [{ publishedfileid: '1000', result: 1 }] };
  };
  const result = await importItems('1000', request);
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.warnings, ['Collection 1000 is empty.']);
});

test('search sends the game scope, build, pagination, and full-text query to Steam', async () => {
  const calls = [];
  const request = async (method, params) => {
    calls.push({ method, params });
    return method === 'QueryFiles' ? { total: 51, publishedfiledetails: [{ publishedfileid: '7' }] } : { publishedfiledetails: [item('7')] };
  };
  const result = await searchItems({ query: 'vehicles', build: 'Build 42', page: 2, key: 'test-key' }, request);
  const params = JSON.parse(calls[0].params.input_json);
  assert.equal(params.appid, 108600);
  assert.equal(params.search_text, 'vehicles');
  assert.equal(params.query_type, 12);
  assert.equal(params.page, 2);
  assert.deepEqual(params.requiredtags, ['Build 42']);
  assert.equal(calls[1].method, 'GetPublishedFileDetails');
  assert.equal(result.hasMore, true);
  assert.equal(result.items[0].modIds[0], 'mod7');
  await assert.rejects(searchItems({ query: 'test' }, request), /STEAM_WEB_API_KEY/);
  await assert.rejects(searchItems({ key: 'test', page: 0 }, request), /page/);
  await assert.rejects(searchItems({ key: 'test', build: 'Made up' }, request), /supported game build/);
});

test('Steam request failures return useful errors without exposing the API key', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 403 }));
  await assert.rejects(steamRequest('QueryFiles', { key: 'secret-key' }), error => {
    assert.match(error.message, /rejected the search API key/);
    assert.ok(!error.message.includes('secret-key'));
    assert.equal(error.status, 502);
    return true;
  });
  await assert.rejects(steamRequest('GetDetails', { key: 'secret-key' }), error => {
    assert.match(error.message, /rejected the dependency lookup API key/);
    assert.ok(!error.message.includes('secret-key'));
    return true;
  });
});

test('requirements follow nested links, deduplicate shared children and cycles, and preserve 64-bit IDs', async () => {
  const large = '18446744073709551615';
  const graph = { '1': ['2', '3', '2'], '2': [large], '3': [large, '1'], [large]: ['2'] };
  const calls = [];
  const result = await getRequirements({ id: '1', key: 'test-key' }, async (method, params) => {
    assert.equal(method, 'GetDetails');
    assert.equal(params.key, 'test-key');
    const input = JSON.parse(params.input_json);
    assert.equal(input.includechildren, true);
    assert.equal(input.includetags, true);
    calls.push(input.publishedfileids);
    return { publishedfiledetails: input.publishedfileids.map(id => requiredItem(id, graph[id])) };
  });
  assert.deepEqual(calls, [['1'], ['2', '3'], [large]]);
  assert.deepEqual(result.requirements.map(mod => mod.id), ['2', '3', large]);
  assert.deepEqual(result.requirements.map(mod => mod.direct), [true, true, false]);
  assert.ok(result.requirements.every(mod => mod.available));
  assert.deepEqual(result.requirements[0].modIds, ['mod2']);
});

test('requirements expose unavailable, banned, private, other-game, and collection items without adding or expanding them', async () => {
  const overrides = { '2': { result: 9 }, '3': { banned: true }, '4': { visibility: 1 }, '5': { consumer_appid: 730 }, '6': { file_type: 2 } };
  const calls = [];
  const result = await getRequirements({ id: '1', key: 'test-key' }, async (_, params) => {
    const ids = JSON.parse(params.input_json).publishedfileids;
    calls.push(ids);
    return { publishedfiledetails: ids.filter(id => id !== '7').map(id => id === '1' ? requiredItem(id, ['2', '3', '4', '5', '6', '7']) : requiredItem(id, ['8'], overrides[id])) };
  });
  assert.equal(calls.length, 2);
  assert.equal(result.requirements.length, 6);
  assert.ok(result.requirements.every(mod => !mod.available && mod.reason && !mod.modIds));
  assert.match(result.requirements[3].reason, /Not a Project Zomboid item/);
  assert.match(result.requirements[4].reason, /Not a mod/);
  await assert.rejects(getRequirements({ id: '2', key: 'test-key' }, async () => ({ publishedfiledetails: [] })), /Cannot check dependencies/);
});

test('requirements batch wide graphs and reject oversized graphs instead of silently truncating', async () => {
  const calls = [];
  const result = await getRequirements({ id: '1', key: 'test-key' }, async (_, params) => {
    const ids = JSON.parse(params.input_json).publishedfileids;
    calls.push(ids.length);
    return { publishedfiledetails: ids.map(id => requiredItem(id, id === '1' ? Array.from({ length: 205 }, (_, i) => String(i + 2)) : [])) };
  });
  assert.deepEqual(calls, [1, 100, 100, 5]);
  assert.equal(result.requirements.length, 205);
  await assert.rejects(getRequirements({ id: '1', key: 'test-key' }, async () => ({ publishedfiledetails: [requiredItem('1', Array.from({ length: 300 }, (_, i) => String(i + 2)))] })), /exceed 300 Workshop items/);
});

test('requirements distinguish no requirements from incomplete metadata or lookup failures', async () => {
  const result = await getRequirements({ id: '1', key: 'test-key' }, async () => ({ publishedfiledetails: [requiredItem('1', [], { children: undefined })] }));
  assert.deepEqual(result.requirements, []);
  for (const response of [{}, { result: 2, publishedfiledetails: [] }, { publishedfiledetails: [requiredItem('1', [], { children: {} })] }, { publishedfiledetails: [requiredItem('1', [], { num_children: 1 })] }, { publishedfiledetails: [requiredItem('1', ['invalid'])] }]) {
    await assert.rejects(getRequirements({ id: '1', key: 'test-key' }, async () => response), /Steam returned/);
  }
  await assert.rejects(getRequirements({ id: '1', key: 'test-key' }, async () => { throw new Error('network failure'); }), /network failure/);
  await assert.rejects(getRequirements({ id: '1' }), /STEAM_WEB_API_KEY/);
  for (const id of ['0', '-1', 'abc', '18446744073709551616']) await assert.rejects(getRequirements({ id, key: 'test-key' }), /numeric Workshop ID/);
});

test('requirements HTTP route uses authenticated GET details and keeps the key server-side', async t => {
  const previous = process.env.STEAM_WEB_API_KEY;
  process.env.STEAM_WEB_API_KEY = 'requirements-test-secret';
  t.after(() => { if (previous === undefined) delete process.env.STEAM_WEB_API_KEY; else process.env.STEAM_WEB_API_KEY = previous; });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.pathname, '/IPublishedFileService/GetDetails/v1/');
    assert.equal(url.searchParams.get('key'), 'requirements-test-secret');
    assert.equal(options.method, 'GET');
    const ids = JSON.parse(url.searchParams.get('input_json')).publishedfileids;
    return Response.json({ response: { publishedfiledetails: ids.map(id => requiredItem(id, id === '1' ? ['2'] : [])) } });
  });
  async function invoke(id) {
    const req = { url: `/api/workshop?action=requirements&id=${id}`, method: 'GET' };
    const res = { setHeader() {}, end(body) { this.body = JSON.parse(body); } };
    await handler(req, res);
    return res;
  }
  const res = await invoke('1');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.requirements.map(mod => mod.id), ['2']);
  assert.ok(!JSON.stringify(res.body).includes('requirements-test-secret'));
  assert.equal((await invoke('invalid')).statusCode, 400);
  delete process.env.STEAM_WEB_API_KEY;
  assert.equal((await invoke('1')).statusCode, 503);
});

test('HTTP handler enforces JSON and rejects malformed imports without upstream calls', async () => {
  async function invoke(content, contentType) {
    const req = Readable.from([Buffer.from(content)]);
    req.url = '/api/workshop'; req.method = 'POST'; req.headers = { 'content-type': contentType };
    const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = JSON.parse(body); } };
    await handler(req, res);
    return res;
  }
  assert.equal((await invoke('{}', 'text/plain')).statusCode, 415);
  assert.equal((await invoke('{broken', 'application/json')).statusCode, 400);
  assert.equal((await invoke('{"input":"https://evil.test"}', 'application/json')).statusCode, 400);
  assert.equal((await invoke('a'.repeat(16001), 'application/json')).statusCode, 413);
});
