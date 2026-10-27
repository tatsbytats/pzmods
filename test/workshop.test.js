import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { parseInput, extractModIds, normalizeItem, importItems, searchItems, steamRequest } from '../lib/workshop.js';
import handler from '../api/workshop.js';
import { formatModIds } from '../public/format.js';

const item = (id, extra = {}) => ({ publishedfileid: id, result: 1, consumer_app_id: 108600, title: `Mod ${id}`, description: `Mod ID: mod${id}`, ...extra });
const requestIds = params => Object.entries(params).filter(([key]) => key.startsWith('publishedfileids[')).map(([, value]) => value);

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
