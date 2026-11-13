import { firebaseConfig } from "./firebase-config.js?v=3";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, getDocsFromServer, query, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CODE_KEY = "droppszCode";
const $ = id => document.getElementById(id);
const show = id => { ["setupView","loginView","appView"].forEach(v => $(v).classList.toggle("hidden", v !== id)); };

// Starting clients, offered once when the database is empty.
const STARTERS = [
  { name: "Kajen", category: "Real estate", packagePrice: 500, extras: 0, extrasNote: "", videosTotal: 4, notes: "New to real estate — content focused on building his personal brand." },
  { name: "Rueshan", category: "Automotive", packagePrice: 750, extras: 0, extrasNote: "", videosTotal: 8, notes: "Car salesman — exotic and luxury cars." },
  { name: "Wealth Experience", category: "Events", packagePrice: 1250, extras: 350, extrasNote: "event", videosTotal: 0, notes: "Project manager running an influencer event." },
  { name: "Tisant", category: "Real estate", packagePrice: 1000, extras: 0, extrasNote: "", videosTotal: 12, notes: "Real estate agent." },
];

if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE")) {
  show("setupView");
  throw new Error("Firebase config missing");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (_) {
  db = initializeFirestore(app, {});
}
let col = null; // teams/<code word>/clients — set after the code word is checked

const money = n => "$" + (Number(n) || 0).toLocaleString("en-CA", { maximumFractionDigits: 2 });
const num = v => { const n = parseFloat(v); return isFinite(n) && n >= 0 ? n : 0; };
const int = v => Math.max(0, Math.round(num(v)));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let clients = [], loaded = false, editingId = null, deletingId = null, unsub = null;
const busy = new Set();

function setStatus(msg, err) { const s = $("status"); s.textContent = msg || ""; s.className = "status" + (err ? " err" : ""); }

function totals(c) {
  const value = num(c.packagePrice) + num(c.extras);
  const vt = int(c.videosTotal);
  const vd = vt ? Math.min(int(c.videosDelivered), vt) : int(c.videosDelivered);
  const paid = num(c.amountPaid);
  return { value, vt, vd, left: Math.max(0, vt - vd), paid, due: Math.max(0, value - paid) };
}

function renderStats() {
  let value = 0, paid = 0, vt = 0, vd = 0;
  clients.forEach(c => { const t = totals(c); value += t.value; paid += t.paid; vt += t.vt; vd += t.vd; });
  const active = clients.filter(c => { const t = totals(c); return t.vt === 0 || t.left > 0; }).length;
  $("stats").innerHTML = `
    <div class="stat"><div class="k">Clients</div><div class="v">${clients.length}</div><div class="s">${active} in progress</div></div>
    <div class="stat"><div class="k">Contract value</div><div class="v">${money(value)}</div><div class="s">packages + add-ons</div></div>
    <div class="stat"><div class="k">Collected</div><div class="v">${money(paid)}</div><div class="s">${money(Math.max(0, value - paid))} owing</div></div>
    <div class="stat"><div class="k">Videos</div><div class="v">${vd} / ${vt}</div><div class="s">${Math.max(0, vt - vd)} left to make</div></div>`;
}

function renderGrid() {
  const q = $("search").value.trim().toLowerCase();
  const f = $("filter").value;
  if (!loaded) { $("grid").innerHTML = ""; return; }
  if (!clients.length) {
    $("grid").innerHTML = `<div class="empty">No clients yet.<br><br>
      <button class="btn primary" data-act="seed">Load my 4 starting clients</button>
      <div style="margin-top:10px;font-size:13px">or tap <b>+ Add client</b></div></div>`;
    return;
  }
  const list = clients.filter(c => {
    const t = totals(c);
    if (q && !(String(c.name || "").toLowerCase().includes(q) || String(c.category || "").toLowerCase().includes(q))) return false;
    if (f === "active") return t.vt === 0 || t.left > 0;
    if (f === "done") return t.vt > 0 && t.left === 0;
    if (f === "due") return t.due > 0;
    return true;
  });
  if (!list.length) { $("grid").innerHTML = `<div class="empty">No clients match this filter.</div>`; return; }
  $("grid").innerHTML = list.map(c => {
    const t = totals(c);
    const pct = t.vt ? Math.round(t.vd / t.vt * 100) : 0;
    const done = t.vt > 0 && t.left === 0;
    const sub = num(c.extras) ? `${money(c.packagePrice)} + ${money(c.extras)}${c.extrasNote ? " " + esc(c.extrasNote) : ""}` : "package";
    const b = busy.has(c.id) ? "disabled" : "";
    return `<article class="card ${done ? "done" : ""}">
      <div class="top">
        <div><h3 class="name">${esc(c.name)}</h3><span class="tag">${esc(c.category || "Other")}</span></div>
        <div class="price"><div class="big">${money(t.value)}</div><div class="sub">${sub}</div></div>
      </div>
      ${c.notes ? `<p class="notes">${esc(c.notes)}</p>` : ""}
      <div>
        <div class="vrow">
          <div class="vnums">
            <div><b>${t.vd}</b>delivered</div>
            <div><b>${t.vt || "—"}</b>total</div>
            <div><b>${t.vt ? t.left : "—"}</b>left</div>
          </div>
          <div class="stepper">
            <button class="btn" data-act="dec" data-id="${esc(c.id)}" ${b || (t.vd <= 0 ? "disabled" : "")} aria-label="Remove one delivered video">−</button>
            <button class="btn" data-act="inc" data-id="${esc(c.id)}" ${b || (t.vt && t.vd >= t.vt ? "disabled" : "")} aria-label="Mark one more video delivered">+</button>
          </div>
        </div>
        <div class="bar" style="margin-top:10px"><i style="width:${pct}%"></i></div>
      </div>
      <div class="money">
        <span class="${t.due ? "" : "paid-full"}">Paid <b>${money(t.paid)}</b></span>
        <span class="${t.due ? "due" : "paid-full"}">${t.due ? `Owing <b>${money(t.due)}</b>` : `<b>Paid in full</b>`}</span>
      </div>
      <div class="actions">
        <button class="btn" data-act="edit" data-id="${esc(c.id)}">Edit</button>
        <button class="btn danger" data-act="del" data-id="${esc(c.id)}">Delete</button>
      </div>
    </article>`;
  }).join("");
}

function render() { renderStats(); renderGrid(); }

function writeError(e) {
  console.error(e);
  if (e && e.code === "permission-denied") setStatus("Your account doesn't have access to change this data.", true);
  else setStatus("Couldn't save that change. Check your connection and try again.", true);
}

async function bump(id, delta) {
  const c = clients.find(x => x.id === id); if (!c || busy.has(id)) return;
  const t = totals(c);
  let next = t.vd + delta; if (next < 0) next = 0; if (t.vt && next > t.vt) next = t.vt;
  if (next === int(c.videosDelivered)) return;
  busy.add(id); render();
  try { await updateDoc(doc(col, id), { videosDelivered: next, updatedAt: serverTimestamp() }); setStatus(""); }
  catch (e) { writeError(e); }
  finally { busy.delete(id); render(); }
}

async function seed() {
  try {
    const batch = writeBatch(db);
    const now = Date.now();
    STARTERS.forEach((s, i) => batch.set(doc(col), { ...s, videosDelivered: 0, amountPaid: 0, order: now + i, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await batch.commit();
  } catch (e) { writeError(e); }
}

function openForm(c) {
  editingId = c ? c.id : null;
  $("mTitle").textContent = c ? "Edit client" : "Add client";
  $("fName").value = c?.name || "";
  $("fCat").value = c?.category || "Real estate";
  $("fPrice").value = c ? num(c.packagePrice) : "";
  $("fExtra").value = c ? num(c.extras) : "";
  $("fExtraNote").value = c?.extrasNote || "";
  $("fTotal").value = c ? int(c.videosTotal) : "";
  $("fDel").value = c ? int(c.videosDelivered) : "";
  $("fPaid").value = c ? num(c.amountPaid) : "";
  $("fNotes").value = c?.notes || "";
  $("fErr").textContent = "";
  $("modalBg").classList.add("open");
}
function closeForm() { $("modalBg").classList.remove("open"); editingId = null; }

$("form").addEventListener("submit", async ev => {
  ev.preventDefault();
  const name = $("fName").value.trim();
  if (!name) { $("fErr").textContent = "Please enter a client name."; return; }
  const vt = int($("fTotal").value), vd = int($("fDel").value);
  if (vt && vd > vt) { $("fErr").textContent = "Delivered can't be more than the videos in the package."; return; }
  const data = {
    name, category: $("fCat").value,
    packagePrice: num($("fPrice").value), extras: num($("fExtra").value), extrasNote: $("fExtraNote").value.trim(),
    videosTotal: vt, videosDelivered: vd, amountPaid: num($("fPaid").value),
    notes: $("fNotes").value.trim(), updatedAt: serverTimestamp()
  };
  $("saveBtn").disabled = true;
  try {
    if (editingId) await setDoc(doc(col, editingId), data, { merge: true });
    else await addDoc(col, { ...data, order: Date.now(), createdAt: serverTimestamp() });
    closeForm(); setStatus("");
  } catch (e) { writeError(e); $("fErr").textContent = "Couldn't save. Please try again."; }
  finally { $("saveBtn").disabled = false; }
});

$("cancelBtn").onclick = closeForm;
$("modalBg").addEventListener("click", e => { if (e.target === $("modalBg")) closeForm(); });
$("addBtn").onclick = () => openForm(null);
$("search").oninput = renderGrid;
$("filter").onchange = renderGrid;

$("grid").addEventListener("click", e => {
  const b = e.target.closest("button[data-act]"); if (!b || b.disabled) return;
  const id = b.dataset.id, act = b.dataset.act;
  if (act === "inc") bump(id, 1);
  else if (act === "dec") bump(id, -1);
  else if (act === "seed") { b.disabled = true; seed(); }
  else if (act === "edit") openForm(clients.find(x => x.id === id));
  else if (act === "del") {
    deletingId = id;
    const c = clients.find(x => x.id === id);
    $("confirmText").textContent = `This removes ${c?.name || "this client"} for you and your partner. It can't be undone.`;
    $("confirmBg").classList.add("open");
  }
});
$("noDel").onclick = () => { $("confirmBg").classList.remove("open"); deletingId = null; };
$("yesDel").onclick = async () => {
  const id = deletingId; $("confirmBg").classList.remove("open"); deletingId = null; if (!id) return;
  try { await deleteDoc(doc(col, id)); } catch (e) { writeError(e); }
};
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeForm(); $("confirmBg").classList.remove("open"); } });

// Code-word sign-in. No accounts: the app signs in anonymously, and the
// database rules only open teams/<code word>/clients for the right word.
const saved = { get: () => { try { return localStorage.getItem(CODE_KEY); } catch (_) { return null; } },
                set: v => { try { v ? localStorage.setItem(CODE_KEY, v) : localStorage.removeItem(CODE_KEY); } catch (_) {} } };
const normalize = w => String(w || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

async function checkWord(word) {
  if (!auth.currentUser) await signInAnonymously(auth);
  try {
    await getDocsFromServer(query(collection(db, "teams", word, "clients"), limit(1)));
    return true;
  } catch (e) {
    if (e && e.code === "permission-denied") return false;
    throw e;
  }
}

function openTeam(word) {
  if (unsub) { unsub(); unsub = null; }
  col = collection(db, "teams", word, "clients");
  show("appView"); setStatus("Loading clients…"); loaded = false; render();
  unsub = onSnapshot(col, snap => {
    clients = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    loaded = true;
    setStatus(snap.metadata.fromCache && !navigator.onLine ? "Offline — showing saved data. Changes will sync when you're back online." : "");
    render();
  }, err => {
    console.error(err);
    if (err.code === "permission-denied") { leave(); $("lErr").textContent = "The code word has changed. Enter the new one."; return; }
    loaded = true; setStatus("Couldn't load clients. Check your connection.", true); render();
  });
}

function leave() {
  if (unsub) { unsub(); unsub = null; }
  saved.set(null); col = null; clients = []; loaded = false;
  $("lPass").value = ""; show("loginView");
}

$("loginForm").addEventListener("submit", async ev => {
  ev.preventDefault();
  const word = normalize($("lPass").value);
  $("lErr").textContent = "";
  if (!word) { $("lErr").textContent = "Enter the code word."; return; }
  $("lBtn").disabled = true;
  try {
    if (await checkWord(word)) { saved.set(word); openTeam(word); }
    else $("lErr").textContent = "That code word isn't right.";
  } catch (e) {
    console.error(e);
    $("lErr").textContent = navigator.onLine ? "Couldn't check the code word. Try again." : "You're offline. Connect to the internet to sign in.";
  } finally { $("lBtn").disabled = false; }
});
$("outBtn").onclick = leave;

// Returning visits: reopen straight away if a code word was saved on this device.
let started = false;
onAuthStateChanged(auth, user => {
  if (started) return;
  started = true;
  const word = saved.get();
  if (user && word) openTeam(word);
  else show("loginView");
});
