const $ = (s) => document.querySelector(s);
const messages = $('#messages'), input = $('#promptInput'), typing = $('#typing'), form = $('#chatForm'), toast = $('#toast');
const dlg = $('#settingsDlg'), apiUrl = $('#apiUrl'), dlgStatus = $('#dlgStatus');
let toastTimer, busy = false;

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};
let history = [];
try { history = JSON.parse(store.get('alwa.history', '[]')) || []; } catch { history = []; }
const saveHistory = () => store.set('alwa.history', JSON.stringify(history.slice(-60)));
const apiBase = () => store.get('alwa.api', '').trim().replace(/\/+$/, '');

function notify(text) {
  toast.textContent = text; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function escapeText(v) {
  return v.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function renderRich(text) { // aman: escape dulu, baru format ringan
  return escapeText(text).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
}
function setStatus(mode) {
  const dot = $('#statusDot'), txt = $('#statusText');
  dot.classList.toggle('demo', mode !== 'ai');
  txt.textContent = mode === 'ai' ? 'AI aktif' : 'Mode demo';
  dot.title = txt.title = mode === 'ai' ? 'Terhubung ke server AI' : 'Server AI belum terhubung (jawaban demo)';
}
function addMessage(role, text, opts = {}) {
  const empty = messages.querySelector('.welcome-card'); if (empty) empty.remove();
  const row = document.createElement('div'); row.className = `message ${role}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = role === 'user' ? 'K' : '✦';
  const content = document.createElement('div');
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  if (role === 'assistant') bubble.innerHTML = renderRich(text); else bubble.textContent = text;
  content.appendChild(bubble);
  if (role === 'assistant') {
    const actions = document.createElement('div'); actions.className = 'bubble-actions';
    const copy = document.createElement('button'); copy.className = 'copy-btn'; copy.textContent = '▢ Salin jawaban';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); notify('Jawaban berhasil disalin.'); }
      catch { notify('Tidak bisa menyalin pada perangkat ini.'); }
    });
    actions.appendChild(copy); content.appendChild(actions);
  }
  row.append(avatar, content); messages.appendChild(row);
  if (!opts.silent) messages.scrollTop = messages.scrollHeight;
}
function demoAnswer(q) {
  const l = q.toLowerCase();
  if (l.includes('esai') || l.includes('kerangka'))
    return 'Tentu! Untuk latihan, kamu bisa memakai susunan esai berikut:\n\n1. **Pendahuluan** — perkenalkan topik dan alasan topik tersebut penting.\n2. **Isi** — jelaskan 2–3 gagasan utama, sertakan contoh atau alasan pendukung.\n3. **Penutup** — rangkum gagasan dan berikan kesimpulan.\n\nTips: gunakan kalimat sendiri, pastikan setiap paragraf membahas satu gagasan, lalu periksa kembali ejaan dan fakta.';
  if (l.includes('fotosintesis'))
    return 'Fotosintesis adalah proses tumbuhan membuat makanannya sendiri. Tumbuhan menggunakan cahaya matahari, air dari tanah, dan karbon dioksida dari udara untuk menghasilkan gula sebagai makanan. Dalam proses ini, tumbuhan juga melepaskan oksigen.\n\nSederhananya: cahaya matahari membantu daun mengolah air dan karbon dioksida menjadi makanan.';
  if (l.includes('matematika') || l.includes('persentase'))
    return 'Berikut 3 soal latihan persentase:\n\n1. Berapa 20% dari 150?\nPembahasan: 20/100 × 150 = 30.\n\n2. Harga tas Rp200.000 mendapat diskon 15%. Berapa diskonnya?\nPembahasan: 15/100 × 200.000 = Rp30.000.\n\n3. Di kelas ada 40 siswa, 25% mengikuti klub musik. Berapa siswa?\nPembahasan: 25/100 × 40 = 10 siswa.';
  return `Baik, mari kita bahas: "${q}"\n\nUntuk memahaminya, kita bisa membaginya menjadi beberapa bagian:\n1. Kenali dulu istilah atau inti pertanyaannya.\n2. Cari konsep utama yang berkaitan.\n3. Berikan contoh sederhana agar lebih mudah dipahami.\n\nIni jawaban demo. Buka ⚙ Pengaturan lalu isi alamat server ALWA untuk mendapatkan jawaban AI sungguhan.`;
}
async function fetchJson(url, opts = {}, ms = 30000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}
async function askAI() {
  const payload = history.filter(m => !m.demo).slice(-12).map(({ role, content }) => ({ role, content }));
  const r = await fetchJson(apiBase() + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: payload }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'API belum tersedia');
  return data.reply;
}
async function checkHealth(base = apiBase()) {
  try {
    const r = await fetchJson(base + '/api/health', {}, 6000);
    const d = await r.json();
    return r.ok && d.ai ? 'ai' : (r.ok ? 'nokey' : 'down');
  } catch { return 'down'; }
}
async function send(text) {
  const question = text.trim(); if (!question || busy) return;
  busy = true;
  addMessage('user', question); history.push({ role: 'user', content: question }); saveHistory();
  input.value = ''; input.style.height = 'auto';
  typing.classList.add('show'); messages.scrollTop = messages.scrollHeight;
  try {
    let answer, demo = false;
    try { answer = await askAI(); setStatus('ai'); }
    catch {
      await new Promise(r => setTimeout(r, 600));
      answer = demoAnswer(question); demo = true; setStatus('demo');
    }
    history.push({ role: 'assistant', content: answer, demo }); saveHistory();
    addMessage('assistant', answer);
  } finally { busy = false; typing.classList.remove('show'); messages.scrollTop = messages.scrollHeight; }
}
function resetChat() {
  history = []; saveHistory();
  messages.innerHTML = '<div class="welcome-card"><div class="welcome-icon">✦</div><h3>Obrolan baru dimulai!</h3><p>Apa yang ingin kamu pelajari hari ini?</p></div>';
}

form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 110) + 'px'; });
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
document.querySelectorAll('[data-prompt]').forEach(b => b.addEventListener('click', () => send(b.dataset.prompt)));
$('#clearBtn').addEventListener('click', () => { resetChat(); notify('Percakapan dibersihkan.'); });
function applyTheme(light) { document.body.classList.toggle('light', light); const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = light ? '#f1f3ff' : '#10152d'; }
applyTheme(store.get('alwa.theme', 'dark') === 'light');
$('#themeBtn').addEventListener('click', () => { const l = !document.body.classList.contains('light'); applyTheme(l); store.set('alwa.theme', l ? 'light' : 'dark'); });
$('#launcher').addEventListener('click', () => { document.querySelector('.chat-panel').scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus(); });
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  if (btn.dataset.view === 'tips') notify('Tips: tanyakan satu hal secara spesifik agar penjelasan lebih terarah.');
  else { resetChat(); input.focus(); }
}));

// Pengaturan server
function dlgMsg(t, cls = '') { dlgStatus.textContent = t; dlgStatus.className = 'dlg-status ' + cls; }
$('#settingsBtn').addEventListener('click', () => { apiUrl.value = store.get('alwa.api', ''); dlgMsg(''); dlg.showModal(); });
$('#cancelBtn').addEventListener('click', () => dlg.close());
$('#testBtn').addEventListener('click', async () => {
  const base = apiUrl.value.trim().replace(/\/+$/, ''); dlgMsg('Menguji koneksi...');
  const s = await checkHealth(base);
  if (s === 'ai') dlgMsg('Terhubung. AI aktif ✓', 'ok');
  else if (s === 'nokey') dlgMsg('Server terhubung, tetapi API key belum diatur.', 'err');
  else dlgMsg('Tidak bisa terhubung. Periksa alamat, Wi-Fi, dan port.', 'err');
});
$('#settingsForm').addEventListener('submit', async () => {
  let v = apiUrl.value.trim(); if (v && !/^https?:\/\//i.test(v)) v = 'http://' + v;
  store.set('alwa.api', v); setStatus(await checkHealth() === 'ai' ? 'ai' : 'demo'); notify(v ? 'Pengaturan disimpan.' : 'Mode demo diaktifkan.');
});

// Mulai
if (history.length) { history.forEach(m => addMessage(m.role, m.content, { silent: true })); messages.scrollTop = messages.scrollHeight; }
checkHealth().then(s => setStatus(s === 'ai' ? 'ai' : 'demo'));
