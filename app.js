"use strict";
const CATS = ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Abdomem"], VK = "gym.vault.v2", LOCK_MS = 6e5, ITER = 6e5;
const $ = i => document.getElementById(i), te = new TextEncoder(), td = new TextDecoder();
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const k in a) { if (k === "class") e.className = a[k]; else if (k.startsWith("on")) e[k] = a[k]; else e.setAttribute(k, a[k]); } e.append(...c); return e; };
const sv = (t, a = {}, ...c) => { const e = document.createElementNS("http://www.w3.org/2000/svg", t); for (const k in a) e.setAttribute(k, a[k]); e.append(...c); return e; };
const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmt = d => d.split("-").reverse().join("/");
let PASS = null, S = null, SALT = null, sel = null, grp = null, idle, fails = 0, hiddenAt = 0;
const KC = new Map();
function toast(m, err) { const t = $("toast"); t.textContent = m; t.className = "on" + (err ? " err" : ""); clearTimeout(toast.h); toast.h = setTimeout(() => t.className = "", 3500); }

/* ---- Criptografia: PBKDF2 (600 mil iterações) + AES-GCM; sal aleatório por cofre, guardado no envelope ---- */
const b64 = u => { let s = ""; u.forEach(x => s += String.fromCharCode(x)); return btoa(s); };
const ub = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function key(salt) {
  if (KC.has(salt)) return KC.get(salt);
  const m = await crypto.subtle.importKey("raw", te.encode(PASS), "PBKDF2", false, ["deriveKey"]);
  const k = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: ub(salt), iterations: ITER, hash: "SHA-256" }, m, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  KC.set(salt, k); return k;
}
async function seal(obj, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(salt), te.encode(JSON.stringify(obj)));
  return { v: 1, salt, iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}
async function unseal(env) {
  try {
    if (env.v !== 1) throw 0;
    return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub(env.iv) }, await key(env.salt), ub(env.ct))));
  } catch { throw new Error("Senha incorreta ou dados corrompidos."); }
}
async function persist() {
  try { localStorage.setItem(VK, JSON.stringify(await seal(S, SALT))); }
  catch (e) { toast("Não foi possível salvar: " + e.message, 1); }
}
const chk = d => { if (!d || typeof d.ex !== "object" || typeof d.days !== "object") throw new Error("Formato inválido."); return d; };

/* ---- Bloqueio / desbloqueio ---- */
function showLock() {
  const fresh = !localStorage.getItem(VK);
  $("app").classList.add("hide"); $("lock").classList.remove("hide");
  $("p2").classList.toggle("hide", !fresh); $("p2").required = fresh;
  $("p1").value = $("p2").value = ""; $("p1").autocomplete = fresh ? "new-password" : "current-password";
  $("lb").textContent = fresh ? "Criar cofre" : "Desbloquear";
  $("lp").textContent = fresh ? "Crie uma senha forte (mín. 10 caracteres). Ela protege seus dados e não pode ser recuperada." : "Digite sua senha para desbloquear.";
  $("lm").textContent = "";
}
function lock() { S = PASS = SALT = sel = grp = null; KC.clear(); clearTimeout(idle); showLock(); }
const bump = () => { clearTimeout(idle); if (S) idle = setTimeout(lock, LOCK_MS); };
async function unlock(ev) {
  ev.preventDefault();
  const p = $("p1").value, raw = localStorage.getItem(VK), m = $("lm");
  try {
    if (!window.crypto?.subtle) throw new Error("Abra o app pelo endereço HTTPS.");
    if (!raw) {
      if (p.length < 10) throw new Error("Use pelo menos 10 caracteres (dica: 4 palavras soltas).");
      if (p !== $("p2").value) throw new Error("As senhas não conferem.");
    } else if (fails) await new Promise(r => setTimeout(r, Math.min(fails * 1500, 12000)));
    m.textContent = "Abrindo…"; PASS = p;
    if (raw) { const env = JSON.parse(raw); SALT = env.salt; S = await unseal(env); }
    else { SALT = b64(crypto.getRandomValues(new Uint8Array(16))); S = {}; }
    S.ex ??= {}; S.days ??= {}; S.cfg ??= {};
    if (!raw) { await persist(); navigator.storage?.persist?.(); }
    fails = 0; $("lock").classList.add("hide"); $("app").classList.remove("hide"); bump(); go("treinar");
  } catch (e) { PASS = S = SALT = null; KC.clear(); fails++; m.textContent = e.message; }
}

/* ---- Navegação ---- */
function go(t) {
  ["treinar", "cad", "dash", "cfg"].forEach(x => $("v-" + x).classList.toggle("hide", x !== t));
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.t === t));
  ({ treinar: renderT, cad: renderC, dash: renderD, cfg: renderS })[t](); scrollTo(0, 0);
}
const act = () => Object.values(S.ex).filter(e => !e.del);
const lastE = e => e.hist[e.hist.length - 1];

/* ---- Treinar: grupo -> exercícios -> carga ---- */
function renderT() {
  const inG = !!grp;
  $("gwrap").classList.toggle("hide", inG); $("gview").classList.toggle("hide", !inG);
  if (!inG) {
    const g = $("grid"); g.replaceChildren();
    CATS.forEach(c => {
      const n = act().filter(e => e.cat === c).length, d = (S.days[c] || []).slice().sort().pop();
      g.append(h("button", { class: "gb", onclick: () => { grp = c; sel = null; renderT(); } },
        h("b", {}, c), h("small", {}, n + (n === 1 ? " exercício" : " exercícios") + (d ? " · último " + fmt(d).slice(0, 5) : ""))));
    });
    return;
  }
  $("gt").textContent = grp;
  const box = $("sug"); box.replaceChildren();
  if (sel && S.ex[sel] && !S.ex[sel].del) { $("pick").classList.remove("hide"); return; }
  sel = null; $("pick").classList.add("hide");
  const a = act().filter(e => e.cat === grp).sort((x, y) => x.name.localeCompare(y.name));
  if (!a.length) box.append(h("p", { class: "mut" }, "Nenhum exercício neste grupo ainda."));
  a.forEach(e => { const l = lastE(e); box.append(h("button", { class: "sg", onclick: () => pick(e.id) },
    h("span", {}, (l && l.d === today() ? "✔ " : "") + e.name), h("span", { class: "yl" }, l ? l.w + " kg" : "novo"))); });
  box.append(h("button", { class: "sg new", onclick: () => { $("nc").value = grp; go("cad"); } }, "+ Novo exercício em " + grp));
}
function pick(id) {
  sel = id; const e = S.ex[id], l = lastE(e);
  $("pn").textContent = e.name;
  $("hint").textContent = l ? `Último treino: ${l.w} kg (${fmt(l.d)})` : "Primeiro registro";
  $("w").value = l ? l.w : ""; $("sug").replaceChildren(); $("pick").classList.remove("hide");
}
function step(d) { const w = $("w"); w.value = +Math.max(0, (parseFloat(w.value) || 0) + d).toFixed(2); }
async function saveW() {
  const e = S.ex[sel], w = parseFloat($("w").value.replace(",", "."));
  if (!e) return toast("Escolha um exercício.", 1);
  if (!(w > 0 && w < 1000)) return toast("Informe uma carga válida.", 1);
  const d = today(), t = Date.now(), c = e.hist.find(x => x.d === d);
  if (c) { c.w = w; c.t = t; } else e.hist.push({ d, w, t });
  const g = S.days[e.cat] ??= []; if (!g.includes(d)) g.push(d);
  e.upd = t; await persist(); toast(`${e.name}: ${w} kg salvo`);
  sel = null; renderT();
}

/* ---- Cadastrar ---- */
function renderC() {
  const l = $("list"); l.replaceChildren();
  const a = act().sort((x, y) => x.cat.localeCompare(y.cat) || x.name.localeCompare(y.name));
  if (!a.length) l.append(h("p", { class: "mut" }, "Nenhum exercício cadastrado."));
  a.forEach(e => l.append(h("div", { class: "row" },
    h("div", {}, e.name, h("br"), h("small", {}, e.cat + " · " + (lastE(e)?.w ?? 0) + " kg")),
    h("button", { class: "x", onclick: async () => { if (confirm(`Remover "${e.name}"?`)) { e.del = true; e.upd = Date.now(); await persist(); renderC(); } } }, "Remover"))));
}
async function addEx() {
  const name = $("nn").value.trim(), id = slug(name);
  if (!id) return toast("Informe o nome.", 1);
  const x = S.ex[id]; if (x && !x.del) return toast("Exercício já cadastrado.", 1);
  S.ex[id] = { ...(x || { hist: [] }), id, name, cat: $("nc").value, del: false, upd: Date.now() };
  await persist(); $("nn").value = ""; toast("Adicionado"); renderC();
}

/* ---- Dashboard ---- */
function renderD() {
  const tot = CATS.map(c => (S.days[c] || []).length), mx = Math.max(1, ...tot);
  $("bars").replaceChildren(...CATS.map((c, i) => { const b = h("i"); b.style.width = tot[i] / mx * 55 + "%"; return h("div", { class: "bar" }, h("b", {}, c), b, h("span", {}, String(tot[i]))); }));
  const s = $("ds"), keep = s.value;
  s.replaceChildren(h("option", { value: "" }, "Selecione um exercício"), ...act().map(e => h("option", { value: e.id }, e.name)));
  s.value = S.ex[keep] && !S.ex[keep].del ? keep : ""; chart();
}
function chart() {
  const e = S.ex[$("ds").value], box = $("ch"); box.replaceChildren();
  if (!e) return;
  const p = e.hist; if (!p.length) return box.append(h("p", { class: "mut" }, "Sem histórico."));
  const W = 340, H = 200, L = 34, R = 12, T = 14, B = 26, xs = p.map(q => Date.parse(q.d)), ys = p.map(q => q.w);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * .15 || 1, y0 = Math.max(0, lo - pad), y1 = hi + pad;
  const X = v => x1 === x0 ? (L + W - R) / 2 : L + (v - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const s = sv("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img", "aria-label": "Progressão de " + e.name });
  for (let i = 0; i <= 3; i++) { const v = y0 + (y1 - y0) * i / 3, y = Y(v); s.append(sv("line", { x1: L, x2: W - R, y1: y, y2: y, stroke: "#262626" }), sv("text", { x: L - 4, y: y + 3, "text-anchor": "end" }, v.toFixed(1))); }
  s.append(sv("polyline", { points: p.map(q => X(Date.parse(q.d)).toFixed(1) + "," + Y(q.w).toFixed(1)).join(" "), fill: "none", stroke: "#c026d3", "stroke-width": 2.5, "stroke-linejoin": "round" }));
  p.forEach(q => s.append(sv("circle", { cx: X(Date.parse(q.d)), cy: Y(q.w), r: 3.5, fill: "#c026d3" })));
  const sd = d => fmt(d).replace("/20", "/");
  s.append(sv("text", { x: L, y: H - 8 }, sd(p[0].d)), sv("text", { x: W - R, y: H - 8, "text-anchor": "end" }, sd(p[p.length - 1].d)));
  box.append(s, h("p", { class: "mut" }, `${p.length} registro(s) · atual ${p[p.length - 1].w} kg`));
}

/* ---- Ajustes: nuvem, backup ---- */
function renderS() { const c = S.cfg; $("ck").value = c.kind || "X-Access-Key"; $("cb").value = c.bin || ""; $("cs").value = ""; $("cs").placeholder = c.key ? "Chave salva (deixe vazio para manter)" : "Chave da API"; }
async function saveCfg() {
  S.cfg = { kind: $("ck").value, key: $("cs").value.trim() || S.cfg.key || "", bin: $("cb").value.trim() };
  await persist(); renderS(); toast("Configuração salva (cifrada).");
}
function merge(a, b) {
  const o = { ex: {}, days: {}, cfg: a.cfg };
  for (const id of new Set([...Object.keys(a.ex), ...Object.keys(b.ex)])) {
    const x = a.ex[id], y = b.ex[id];
    if (!x || !y) { o.ex[id] = structuredClone(x || y); continue; }
    const n = (x.upd || 0) >= (y.upd || 0) ? x : y, m = {};
    for (const e of [...x.hist, ...y.hist]) { const c = m[e.d]; if (!c || e.t > c.t) m[e.d] = e; }   // mesmo dia: vale o registro mais recente
    o.ex[id] = { ...structuredClone(n), hist: Object.values(m).sort((p, q) => p.d < q.d ? -1 : 1) };
  }
  for (const g of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) o.days[g] = [...new Set([...(a.days[g] || []), ...(b.days[g] || [])])].sort();
  return o;
}
async function doSync() {
  const c = S.cfg, say = t => $("sm").textContent = t, btn = $("sync");
  if (!c.key || !c.bin) return say("Preencha e salve a configuração da nuvem abaixo.");
  if (!navigator.onLine) return say("Sem conexão. Tente de novo quando tiver internet.");
  const url = "https://api.jsonbin.io/v3/b/" + encodeURIComponent(c.bin), H = { [c.kind]: c.key };
  btn.disabled = true;
  try {
    say("Baixando da nuvem…"); let rec;
    try { const r = await fetch(url + "/latest", { headers: H, cache: "no-store" }); if (!r.ok) throw new Error("HTTP " + r.status); rec = (await r.json()).record || {}; }
    catch (e) { throw new Error("Falha ao baixar: " + e.message); }
    let out = S;
    if (rec.ct) { say("Descriptografando e mesclando…"); out = merge(S, chk(await unseal(rec))); }   // se falhar, aborta sem tocar na nuvem
    say("Enviando…");
    const env = await seal({ ex: out.ex, days: out.days }, SALT);
    try { const r = await fetch(url, { method: "PUT", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(env) }); if (!r.ok) throw new Error("HTTP " + r.status); }
    catch (e) { throw new Error("Falha ao enviar: " + e.message); }
    S = out; await persist(); say("Sincronizado às " + new Date().toLocaleTimeString("pt-BR") + " ✔");
  } catch (e) { say("Erro: " + e.message); toast(e.message, 1); }
  finally { btn.disabled = false; }
}
async function exportB() {
  try {
    const env = await seal({ ex: S.ex, days: S.days }, SALT);
    const f = new File([JSON.stringify(env)], "cargas-backup-" + today() + ".json", { type: "application/json" });
    if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f] }); return; } catch (e) { if (e.name === "AbortError") return; } }
    const a = h("a", { href: URL.createObjectURL(f), download: f.name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
  } catch (e) { toast("Erro ao exportar: " + e.message, 1); }
}
async function importB(ev) {
  const f = ev.target.files[0]; ev.target.value = ""; if (!f) return;
  try { S = merge(S, chk(await unseal(JSON.parse(await f.text())))); await persist(); go("cfg"); toast("Backup mesclado."); }
  catch (e) { toast("Importação falhou: " + e.message, 1); }
}

/* ---- Inicialização ---- */
$("nc").append(...CATS.map(c => h("option", {}, c)));
$("lf").onsubmit = unlock; $("bcfg").onclick = () => go("cfg"); $("block").onclick = lock;
document.querySelectorAll("nav button").forEach(b => b.onclick = () => { if (b.dataset.t === "treinar" && !$("v-treinar").classList.contains("hide")) grp = sel = null; go(b.dataset.t); });
$("gback").onclick = () => { if (sel) sel = null; else grp = null; renderT(); };
$("m").onclick = () => step(-2.5); $("pl").onclick = () => step(2.5);
$("bsv").onclick = saveW; $("add").onclick = addEx; $("ds").onchange = chart;
$("sync").onclick = doSync; $("csv").onclick = saveCfg; $("bex").onclick = exportB; $("im").onchange = importB;
["pointerdown", "keydown"].forEach(e => addEventListener(e, bump, { passive: true }));
document.addEventListener("visibilitychange", () => { if (document.hidden) hiddenAt = Date.now(); else if (S && Date.now() - hiddenAt > LOCK_MS) lock(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
showLock();
