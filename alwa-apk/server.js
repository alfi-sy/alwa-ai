// Backend ALWA AI. Menyimpan API key di server (.env), bukan di aplikasi/APK.
const http = require('http');
const fs = require('fs');
const path = require('path');
try { require('dotenv').config(); } catch {}

const WWW = path.join(__dirname, 'www');           // hanya folder ini yang dilayani publik
const PORT = process.env.PORT || 3000;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const SYSTEM = 'Kamu adalah ALWA, asisten belajar yang ramah. Jawab dalam bahasa Indonesia yang jelas, bantu memahami konsep dan latihan. Jangan mengerjakan ujian aktif atau membantu kecurangan akademik.';
const hits = new Map(); // rate limit sederhana per IP

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
  res.end(JSON.stringify(obj));
}
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(ip, arr); return arr.length > 20;
}
function readBody(req, max = 50000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > max) { reject(new Error('Permintaan terlalu besar.')); req.destroy(); } });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
function cleanMessages(b) {
  let list = Array.isArray(b.messages) ? b.messages : (typeof b.message === 'string' ? [{ role: 'user', content: b.message }] : []);
  list = list.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
             .slice(-12).map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!list.length || list[list.length - 1].role !== 'user') throw new Error('Pertanyaan kosong.');
  return list;
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (url === '/api/health') return json(res, 200, { ok: true, ai: !!process.env.OPENAI_API_KEY });

  if (req.method === 'POST' && url === '/api/chat') {
    try {
      if (limited(req.socket.remoteAddress)) return json(res, 429, { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
      if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: 'API key belum diatur' });
      const msgs = cleanMessages(JSON.parse((await readBody(req)) || '{}'));
      const endpoint = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const api = await fetch(endpoint, {
        method: 'POST', signal: AbortSignal.timeout(45000),
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0.7, messages: [{ role: 'system', content: SYSTEM }, ...msgs] })
      });
      const data = await api.json();
      if (!api.ok) throw new Error(data.error?.message || 'Layanan AI gagal merespons.');
      return json(res, 200, { reply: data.choices?.[0]?.message?.content || 'Maaf, belum ada jawaban.' });
    } catch (err) { return json(res, 500, { error: err.message }); }
  }

  let pathname;
  try { pathname = decodeURIComponent(url); } catch { res.writeHead(400); return res.end('Bad request'); }
  const file = path.join(WWW, pathname === '/' ? 'index.html' : pathname);
  if (file !== WWW && !file.startsWith(WWW + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
server.listen(PORT, '0.0.0.0', () => console.log(`ALWA AI berjalan di http://localhost:${PORT}`));
