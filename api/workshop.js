import { importItems, searchItems, getRequirements, RequestError } from '../lib/workshop.js';

async function readBody(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new RequestError('Send imports as JSON.', 415);
  if (req.body != null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    try { return JSON.parse(String(req.body)); } catch { throw new RequestError('The import request is not valid JSON.'); }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16000) throw new RequestError('The import is too large. Paste fewer links or IDs.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new RequestError('The import request is not valid JSON.'); }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const url = new URL(req.url, 'http://localhost');
    const signal = AbortSignal.timeout(24000);
    let result;
    if (req.method === 'GET' && url.searchParams.get('action') === 'config') {
      result = { searchEnabled: Boolean(process.env.STEAM_WEB_API_KEY?.trim()) };
    } else if (req.method === 'GET' && url.searchParams.get('action') === 'search') {
      result = await searchItems({ query: url.searchParams.get('q') || '', build: url.searchParams.get('build') || '', page: Number(url.searchParams.get('page') || 1), key: process.env.STEAM_WEB_API_KEY?.trim() }, undefined, signal);
    } else if (req.method === 'GET' && url.searchParams.get('action') === 'requirements') {
      result = await getRequirements({ id: url.searchParams.get('id'), key: process.env.STEAM_WEB_API_KEY?.trim() }, undefined, signal);
    } else if (req.method === 'POST') {
      const body = await readBody(req);
      result = await importItems(body?.input, undefined, signal);
    } else {
      throw new RequestError('Use a search or import request.', 405);
    }
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (error) {
    res.statusCode = error instanceof RequestError ? error.status : 500;
    res.end(JSON.stringify({ error: error instanceof RequestError ? error.message : 'The server could not complete this request. Please try again.' }));
  }
}
