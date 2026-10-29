/* Schedula - logika front-end (data disimpan di localStorage) */
const $ = s => document.querySelector(s);
const E = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); // tanggal lokal (bukan UTC)
const d0 = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const TODAY = d0(0);
const fmt = s => s ? new Date(s + "T00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const onDate = (j, ds) => j.jenis == "kuliah" ? new Date(ds + "T00:00").getDay() == +j.hari : j.tgl == ds; // kuliah: berulang tiap minggu
const nextDate = j => { if (j.jenis != "kuliah") return j.tgl; for (let i = 0; i < 7; i++) if (onDate(j, d0(i))) return d0(i); return TODAY; };
const ST = ["Belum Mulai", "Dikerjakan", "Selesai"], PR = ["Rendah", "Sedang", "Tinggi"];
const BADGE = { "Belum Mulai": "secondary", Dikerjakan: "primary", Selesai: "success", Rendah: "success", Sedang: "primary", Tinggi: "danger" };

/* ===== DATA ===== */
const SEED = {
  mk: [{ id: 1, kode: "TIF101", nama: "Algoritma dan Pemrograman", dosen: "Bu Rina" }, { id: 2, kode: "TIF102", nama: "Basis Data", dosen: "Pak Andi" }, { id: 3, kode: "TIF103", nama: "Pemrograman Web", dosen: "Bu Sari" }],
  tugas: [
    { id: 1, mk: 1, judul: "Latihan Struktur Kontrol", beri: d0(-5), dl: d0(2), pri: "Tinggi", st: "Dikerjakan", cat: "Kumpul via LMS" },
    { id: 2, mk: 2, judul: "Rancang ERD Perpustakaan", beri: d0(-3), dl: d0(5), pri: "Sedang", st: "Belum Mulai", cat: "" },
    { id: 3, mk: 3, judul: "Landing Page HTML & CSS", beri: d0(-10), dl: d0(-1), pri: "Rendah", st: "Selesai", cat: "Sudah dinilai" },
    { id: 4, mk: 2, judul: "Query SQL Dasar", beri: d0(-2), dl: d0(9), pri: "Sedang", st: "Belum Mulai", cat: "" }],
  jad: [
    { id: 1, mk: 1, tgl: d0(0), mulai: "19:00", selesai: "20:30", topik: "Perulangan & array" },
    { id: 2, mk: 2, tgl: d0(1), mulai: "16:00", selesai: "17:30", topik: "Normalisasi" },
    { id: 3, mk: 3, tgl: d0(3), mulai: "10:00", selesai: "12:00", topik: "Flexbox & Grid" }]
};

const SET_DEF = { on: true, tugas: true, hari: 3, jadwal: true, menit: 30, browser: false }; // pengaturan pengingat bawaan

/* ===== AKUN & SESI (disimpan di localStorage/sessionStorage) ===== */
const U_KEY = "schedula_users", S_KEY = "schedula_session";
const getUsers = () => { try { return JSON.parse(localStorage.getItem(U_KEY)) || {}; } catch (e) { return {}; } };
const setUsers = u => { try { localStorage.setItem(U_KEY, JSON.stringify(u)); } catch (e) { } };
const getSes = () => { try { return JSON.parse(sessionStorage.getItem(S_KEY) || localStorage.getItem(S_KEY)); } catch (e) { return null; } };
let SESSION = getSes();
async function sha(u, p) { // kata sandi tidak disimpan sebagai teks biasa
  const s = "schedula:" + u + ":" + p;
  try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
  catch (e) { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "f" + h; }
}
async function seedUsers() { // akun demo saat belum ada akun sama sekali
  const u = getUsers();
  if (!Object.keys(u).length) { u.mahasiswa = { nama: "Mahasiswa Demo", hash: await sha("mahasiswa", "schedula123") }; setUsers(u); }
}
function startSession(user, nama, remember) {
  const s = JSON.stringify({ user, nama });
  try { sessionStorage.removeItem(S_KEY); localStorage.removeItem(S_KEY); (remember ? localStorage : sessionStorage).setItem(S_KEY, s); } catch (e) { }
  SESSION = { user, nama }; loadDB();
}
function logout() {
  try { sessionStorage.removeItem(S_KEY); localStorage.removeItem(S_KEY); } catch (e) { }
  SESSION = null; DB = null; location.hash = "#/login"; toast("Anda sudah keluar");
}

/* Data tiap akun dipisah: schedula:<username> */
let DB;
const dbKey = () => "schedula:" + (SESSION ? SESSION.user : "");
function loadDB() {
  DB = null; try { DB = JSON.parse(localStorage.getItem(dbKey())); } catch (e) { }
  DB = DB || JSON.parse(JSON.stringify(SEED));
  DB.set = { ...SET_DEF, ...(DB.set || {}) }; DB.read = DB.read || {}; DB.pushed = DB.pushed || {};
  const old = d0(-14); [DB.read, DB.pushed].forEach(o => Object.keys(o).forEach(k => { if (o[k] < old) delete o[k]; })); // buang catatan lama
}
const save = () => { try { localStorage.setItem(dbKey(), JSON.stringify(DB)); } catch (e) { } clearTimeout(save.t); save.t = setTimeout(checkNotifs, 300); };
if (SESSION) loadDB();
const nid = a => a.reduce((m, x) => Math.max(m, x.id), 0) + 1;
const mkName = id => (DB.mk.find(m => m.id == id) || {}).nama || "-";
const mkOpts = () => DB.mk.map(m => [m.id, m.nama]);

/* ===== KOMPONEN BOOTSTRAP ===== */
function toast(msg, err, delay) {
  const el = document.createElement("div");
  el.className = "toast align-items-center border-0 text-bg-" + (err === 2 ? "primary" : err ? "danger" : "success");
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${E(msg)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  $("#toasts").append(el);
  el.addEventListener("hidden.bs.toast", () => el.remove());
  new bootstrap.Toast(el, { delay: delay || 2500 }).show();
}
function modal(title, body, footer) {
  const el = document.createElement("div");
  el.className = "modal fade"; el.tabIndex = -1;
  el.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">${title}</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">${body}</div><div class="modal-footer">${footer}</div></div></div>`;
  document.body.append(el);
  const m = new bootstrap.Modal(el);
  el.addEventListener("hidden.bs.modal", () => { m.dispose(); el.remove(); });
  m.show();
  return { el, m };
}
function confirmDel(msg, fn) {
  const { el, m } = modal("Konfirmasi Hapus", `<p class="mb-0">${E(msg)}</p>`,
    `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-danger" id="ya">Hapus</button>`);
  el.querySelector("#ya").onclick = () => { m.hide(); fn(); };
}
function form(title, fields, v, fn) {
  v = v || {};
  const body = fields.map(f => {
    const val = v[f.k] ?? f.def ?? "";
    let i;
    if (f.t == "select") i = `<select class="form-select" name="${f.k}">${f.o.map(o => `<option value="${E(o[0])}" ${o[0] == val ? "selected" : ""}>${E(o[1])}</option>`).join("")}</select>`;
    else if (f.t == "textarea") i = `<textarea class="form-control" name="${f.k}" rows="3">${E(val)}</textarea>`;
    else i = `<input class="form-control" name="${f.k}" type="${f.t || "text"}" value="${E(val)}">`;
    return `<div class="mb-3"${f.w ? ` data-w="${f.w[0]}:${f.w[1]}"` : ""}><label class="form-label">${f.l}${f.r ? ' <span class="text-danger">*</span>' : ""}</label>${i}<div class="invalid-feedback"></div></div>`;
  }).join("");
  const { el, m } = modal(title, body, `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" id="simpan">Simpan</button>`);
  const upd = () => el.querySelectorAll("[data-w]").forEach(d => { const [k, x] = d.dataset.w.split(":"); d.classList.toggle("d-none", el.querySelector(`[name=${k}]`).value != x); });
  el.querySelectorAll("select").forEach(x => x.addEventListener("change", upd)); upd();
  el.querySelector("#simpan").onclick = () => {
    const r = {}; let ok = true;
    const err = (k, msg) => { const inp = el.querySelector(`[name=${k}]`); inp.classList.add("is-invalid"); inp.nextElementSibling.textContent = msg; ok = false; };
    el.querySelectorAll(".is-invalid").forEach(x => x.classList.remove("is-invalid"));
    fields.forEach(f => { r[f.k] = el.querySelector(`[name=${f.k}]`).value.trim(); if (f.r && !r[f.k] && !el.querySelector(`[name=${f.k}]`).closest(".d-none")) err(f.k, f.l + " wajib diisi"); });
    if (ok && r.selesai && r.mulai && r.selesai <= r.mulai) err("selesai", "Jam selesai harus setelah jam mulai");
    if (ok && r.dl && r.beri && r.dl < r.beri) err("dl", "Deadline tidak boleh sebelum tanggal diberikan");
    if (ok) { fn(r); m.hide(); }
  };
}
const tbl = (h, rows, empty) => `<div class="table-responsive"><table class="table table-hover align-middle"><thead class="table-light"><tr>${h.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${h.length}" class="text-center text-muted py-4">${empty || "Data tidak ditemukan"}</td></tr>`}</tbody></table></div>`;
const bd = x => `<span class="badge text-bg-${BADGE[x]}">${x}</span>`;
const aksi = id => `<td class="btn-aksi"><button class="btn btn-sm btn-outline-primary me-1" data-e="${id}"><i class="bi bi-pencil"></i> Edit</button><button class="btn btn-sm btn-outline-danger" data-d="${id}"><i class="bi bi-trash"></i> Hapus</button></td>`;
const head = (t, extra) => `<div class="d-flex flex-wrap gap-2 align-items-center mb-3"><h2 class="h3 me-auto mb-0">${t}</h2>${extra || ""}</div>`;
const addBtn = `<button class="btn btn-primary" id="add"><i class="bi bi-plus-lg"></i> Tambah Data</button>`;
const sel = (id, arr, v, ph) => `<select class="form-select w-auto" id="${id}"><option value="">${ph}</option>${arr.map(o => `<option value="${E(o[0])}" ${o[0] == v ? "selected" : ""}>${E(o[1])}</option>`).join("")}</select>`;
const statCard = (n, l, c) => `<div class="col-6 col-lg-3"><div class="card shadow-sm h-100"><div class="card-body"><div class="stat text-${c}">${n}</div><div class="text-muted small">${l}</div></div></div></div>`;
const wrap = h => `<div class="container my-4">${h}</div>`;

/* ===== HALAMAN ===== */
const P = {};

P[""] = () => `
<!-- HERO SECTION -->
<header class="hero text-white text-center py-5 position-relative">
  <!-- Overlay hitam transparan agar teks tetap terbaca -->
  <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>
  <div class="container py-5 position-relative z-1">
    <h1 class="display-5 fw-bold mb-3">Selamat Datang di Schedula</h1>
    <p class="lead mb-4">Atur jadwal dan manajemen waktumu!</p>
    <a href="#fitur" id="belajar" class="btn btn-light btn-lg rounded-pill px-4 text-primary">Pelajari Lebih Lanjut</a>
  </div>
</header>
<!-- FITUR -->
<section class="container my-5" id="fitur">
  <h2 class="text-center fw-bold mb-4">Fitur Unggulan</h2>
  <div class="row g-4">
    <div class="col-md-4"><div class="card h-100 text-center shadow-sm"><div class="card-body py-4">
      <i class="bi bi-bell-fill text-primary display-4"></i><h5 class="card-title fw-bold mt-3">Notifikasi</h5>
      <p class="card-text text-muted">Reminder untuk tugas dan jadwal.</p></div></div></div>
    <div class="col-md-4"><div class="card h-100 text-center shadow-sm"><div class="card-body py-4">
      <i class="bi bi-code-slash text-success display-4"></i><h5 class="card-title fw-bold mt-3">Fitur CRUD</h5>
      <p class="card-text text-muted">Membuat, melihat, mengupdate, menghapus.</p></div></div></div>
    <div class="col-md-4"><div class="card h-100 text-center shadow-sm"><div class="card-body py-4">
      <i class="bi bi-calendar-check-fill text-warning display-4"></i><h5 class="card-title fw-bold mt-3">Pengatur Jadwal</h5>
      <p class="card-text text-muted">Memilih tanggal di kalender.</p></div></div></div>
  </div>
  <div class="text-center mt-4"><a class="btn btn-primary" href="#/dashboard">Buka Dashboard</a></div>
</section>`;
P[""].init = () => { $("#belajar").onclick = e => { e.preventDefault(); $("#fitur").scrollIntoView({ behavior: "smooth" }); }; };

P.dashboard = () => {
  const open = DB.tugas.filter(t => t.st != "Selesai");
  const near = open.filter(t => t.dl >= TODAY && t.dl <= d0(7)).sort((a, b) => a.dl.localeCompare(b.dl));
  const late = open.filter(t => t.dl < TODAY);
  const td = DB.jad.filter(j => onDate(j, TODAY)).sort((a, b) => a.mulai.localeCompare(b.mulai));
  return wrap(head("Dashboard", `<span class="text-muted">Halo, ${E(SESSION.nama)}</span>`) + remind() + `<div class="row g-3 mb-4">${statCard(open.length, "Tugas belum selesai", "primary")}${statCard(near.length, "Deadline 7 hari ke depan", "warning")}${statCard(late.length, "Lewat deadline", "danger")}${statCard(td.length, "Jadwal belajar hari ini", "success")}</div>
  <h3 class="h5">Tugas Dekat Deadline</h3>${tbl(["Judul", "Mata Kuliah", "Deadline", "Status"], near.map(t => `<tr><td>${E(t.judul)}</td><td>${E(mkName(t.mk))}</td><td>${fmt(t.dl)}</td><td>${bd(t.st)}</td></tr>`).join(""), "Tidak ada tugas mendekati deadline")}
  <h3 class="h5 mt-4">Jadwal Hari Ini</h3>${tbl(["Waktu", "Mata Kuliah", "Topik"], td.map(j => `<tr><td>${j.mulai}-${j.selesai}</td><td>${E(mkName(j.mk))}</td><td>${E(j.topik)}</td></tr>`).join(""), "Tidak ada jadwal hari ini")}`);
};

P.matkul = () => {
  const q = (P._q || "").toLowerCase(), L = DB.mk.filter(m => (m.kode + m.nama + m.dosen).toLowerCase().includes(q));
  return wrap(head("Mata Kuliah", `<input class="form-control w-auto" id="q" placeholder="Cari..." value="${E(P._q || "")}">${addBtn}`) +
    tbl(["Kode", "Nama Mata Kuliah", "Dosen", "Aksi"], L.map(m => `<tr><td>${E(m.kode)}</td><td>${E(m.nama)}</td><td>${E(m.dosen)}</td>${aksi(m.id)}</tr>`).join("")));
};
P.matkul.init = () => {
  const F = [{ k: "kode", l: "Kode MK", r: 1 }, { k: "nama", l: "Nama Mata Kuliah", r: 1 }, { k: "dosen", l: "Dosen", r: 1 }];
  $("#add").onclick = () => form("Tambah Mata Kuliah", F, {}, r => {
    if (DB.mk.some(m => m.kode.toLowerCase() == r.kode.toLowerCase())) return toast("Kode MK sudah ada", 1);
    DB.mk.push({ id: nid(DB.mk), ...r }); save(); toast("Mata kuliah berhasil ditambahkan"); route();
  });
  document.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { const m = DB.mk.find(x => x.id == b.dataset.e); form("Ubah Mata Kuliah", F, m, r => { Object.assign(m, r); save(); toast("Data berhasil diubah"); route(); }); });
  document.querySelectorAll("[data-d]").forEach(b => b.onclick = () => {
    const id = +b.dataset.d;
    if (DB.tugas.some(t => t.mk == id) || DB.jad.some(j => j.mk == id)) return toast("Gagal: mata kuliah masih dipakai tugas/jadwal", 1);
    confirmDel("Hapus mata kuliah ini?", () => { DB.mk = DB.mk.filter(m => m.id != id); save(); toast("Data berhasil dihapus"); route(); });
  });
  $("#q").oninput = e => { P._q = e.target.value; route(1); };
};

P.tugas = () => {
  const f = P._f || {}, q = (f.q || "").toLowerCase();
  const L = DB.tugas.filter(t => (!q || (t.judul + mkName(t.mk)).toLowerCase().includes(q)) && (!f.st || t.st == f.st) && (!f.pri || t.pri == f.pri) && (!f.mk || t.mk == f.mk) && (!f.dari || t.dl >= f.dari) && (!f.sampai || t.dl <= f.sampai)).sort((a, b) => a.dl.localeCompare(b.dl));
  return wrap(head("Tugas", addBtn) +
    `<div class="d-flex flex-wrap gap-2 align-items-center mb-3"><input class="form-control w-auto" id="q" placeholder="Cari judul / mata kuliah" value="${E(f.q || "")}">${sel("fst", ST.map(x => [x, x]), f.st, "Semua status")}${sel("fpri", PR.map(x => [x, x]), f.pri, "Semua prioritas")}${sel("fmk", mkOpts(), f.mk, "Semua mata kuliah")}<span class="text-muted">Deadline</span><input type="date" class="form-control w-auto" id="fd" value="${f.dari || ""}"><span class="text-muted">s/d</span><input type="date" class="form-control w-auto" id="fs" value="${f.sampai || ""}"></div>` +
    tbl(["Judul", "Mata Kuliah", "Deadline", "Prioritas", "Status", "Aksi"], L.map(t => `<tr><td>${E(t.judul)}<div class="small text-muted">${E(t.cat)}</div></td><td>${E(mkName(t.mk))}</td><td>${fmt(t.dl)}</td><td>${bd(t.pri)}</td><td><select class="form-select form-select-sm" data-s="${t.id}">${ST.map(s => `<option ${s == t.st ? "selected" : ""}>${s}</option>`).join("")}</select></td>${aksi(t.id)}</tr>`).join("")));
};
P.tugas.init = () => {
  const F = () => [{ k: "judul", l: "Judul Tugas", r: 1 }, { k: "mk", l: "Mata Kuliah", t: "select", o: mkOpts(), r: 1 }, { k: "beri", l: "Tanggal Diberikan", t: "date", r: 1, def: TODAY }, { k: "dl", l: "Deadline", t: "date", r: 1 }, { k: "pri", l: "Prioritas", t: "select", o: PR.map(x => [x, x]), def: "Sedang" }, { k: "st", l: "Status", t: "select", o: ST.map(x => [x, x]) }, { k: "cat", l: "Catatan", t: "textarea" }];
  $("#add").onclick = () => { if (!DB.mk.length) return toast("Tambahkan mata kuliah dulu", 1); form("Tambah Tugas", F(), {}, r => { DB.tugas.push({ id: nid(DB.tugas), ...r, mk: +r.mk }); save(); toast("Tugas berhasil ditambahkan"); route(); }); };
  document.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { const t = DB.tugas.find(x => x.id == b.dataset.e); form("Ubah Tugas", F(), t, r => { Object.assign(t, r, { mk: +r.mk }); save(); toast("Data berhasil diubah"); route(); }); });
  document.querySelectorAll("[data-d]").forEach(b => b.onclick = () => confirmDel("Hapus tugas ini?", () => { DB.tugas = DB.tugas.filter(t => t.id != b.dataset.d); save(); toast("Data berhasil dihapus"); route(); }));
  document.querySelectorAll("[data-s]").forEach(s => s.onchange = () => { DB.tugas.find(t => t.id == s.dataset.s).st = s.value; save(); toast("Status diperbarui"); route(1); });
  const set = () => { P._f = { q: $("#q").value, st: $("#fst").value, pri: $("#fpri").value, mk: $("#fmk").value, dari: $("#fd").value, sampai: $("#fs").value }; route(1); };
  ["q", "fst", "fpri", "fmk", "fd", "fs"].forEach(i => $("#" + i).oninput = set);
};

P.jadwal = () => {
  const q = (P._q || "").toLowerCase(), L = DB.jad.filter(j => (j.topik + mkName(j.mk) + (j.jenis == "kuliah" ? "kuliah " + HARI[j.hari] : j.tgl)).toLowerCase().includes(q)).sort((a, b) => (nextDate(a) + a.mulai).localeCompare(nextDate(b) + b.mulai));
  return wrap(head("Jadwal Belajar", `<input class="form-control w-auto" id="q" placeholder="Cari topik / mata kuliah" value="${E(P._q || "")}">${addBtn}`) +
    tbl(["Hari / Tanggal", "Waktu", "Mata Kuliah", "Topik", "Aksi"], L.map(j => `<tr><td>${j.jenis == "kuliah" ? `Setiap ${HARI[j.hari]} <span class="badge text-bg-primary">Kuliah</span>` : fmt(j.tgl)}${onDate(j, TODAY) ? ' <span class="badge text-bg-info">Hari ini</span>' : ""}</td><td>${j.mulai}-${j.selesai}</td><td>${E(mkName(j.mk))}</td><td>${E(j.topik)}</td>${aksi(j.id)}</tr>`).join("")));
};
P.jadwal.init = () => {
  const F = () => [{ k: "jenis", l: "Jenis Jadwal", t: "select", o: [["kuliah", "Jadwal Kuliah (berulang tiap minggu)"], ["lain", "Di Luar Kuliah (sekali saja)"]], def: "lain" }, { k: "mk", l: "Mata Kuliah", t: "select", o: mkOpts(), r: 1 }, { k: "hari", l: "Hari Kuliah (setiap minggu)", t: "select", o: HARI.map((h, i) => [i, h]), r: 1, w: ["jenis", "kuliah"], def: new Date().getDay() }, { k: "tgl", l: "Tanggal", t: "date", r: 1, w: ["jenis", "lain"], def: TODAY }, { k: "mulai", l: "Jam Mulai", t: "time", r: 1 }, { k: "selesai", l: "Jam Selesai", t: "time", r: 1 }, { k: "topik", l: "Topik", r: 1 }];
  $("#add").onclick = () => { if (!DB.mk.length) return toast("Tambahkan mata kuliah dulu", 1); form("Tambah Jadwal", F(), {}, r => { DB.jad.push({ id: nid(DB.jad), ...r, mk: +r.mk }); save(); toast("Jadwal berhasil ditambahkan"); route(); }); };
  document.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { const j = DB.jad.find(x => x.id == b.dataset.e); form("Ubah Jadwal", F(), j, r => { Object.assign(j, r, { mk: +r.mk }); save(); toast("Data berhasil diubah"); route(); }); });
  document.querySelectorAll("[data-d]").forEach(b => b.onclick = () => confirmDel("Hapus jadwal ini?", () => { DB.jad = DB.jad.filter(j => j.id != b.dataset.d); save(); toast("Data berhasil dihapus"); route(); }));
  $("#q").oninput = e => { P._q = e.target.value; route(1); };
};

P.rekap = () => {
  const f = P._r || {};
  const L = DB.tugas.filter(t => (!f.mk || t.mk == f.mk) && (!f.dari || t.dl >= f.dari) && (!f.sampai || t.dl <= f.sampai)).sort((a, b) => a.dl.localeCompare(b.dl));
  const byS = ST.map(s => [s, L.filter(t => t.st == s).length]);
  const byM = DB.mk.filter(m => !f.mk || m.id == f.mk).map(m => [m.nama, ...ST.map(s => L.filter(t => t.mk == m.id && t.st == s).length), L.filter(t => t.mk == m.id).length]);
  return wrap(head("Rekap") +
    `<div class="d-flex flex-wrap gap-2 align-items-center mb-4">${sel("rmk", mkOpts(), f.mk, "Semua mata kuliah")}<span class="text-muted">Deadline</span><input type="date" class="form-control w-auto" id="rd" value="${f.dari || ""}"><span class="text-muted">s/d</span><input type="date" class="form-control w-auto" id="rs" value="${f.sampai || ""}"></div>
    <h3 class="h5">Rekap per Status</h3>${tbl(["Status", "Jumlah"], byS.map(r => `<tr><td>${bd(r[0])}</td><td>${r[1]}</td></tr>`).join("") + `<tr class="fw-bold"><td>Total</td><td>${L.length}</td></tr>`)}
    <h3 class="h5 mt-4">Rekap per Mata Kuliah</h3>${tbl(["Mata Kuliah", ...ST, "Total"], byM.map(r => `<tr>${r.map(x => `<td>${E(x)}</td>`).join("")}</tr>`).join(""))}
    <h3 class="h5 mt-4">Daftar Tugas pada Periode</h3>${tbl(["Judul", "Mata Kuliah", "Deadline", "Status"], L.map(t => `<tr><td>${E(t.judul)}</td><td>${E(mkName(t.mk))}</td><td>${fmt(t.dl)}</td><td>${bd(t.st)}</td></tr>`).join(""))}
    <p class="text-muted mt-2">Jumlah tugas: <b>${L.length}</b></p>`);
};
P.rekap.init = () => { const set = () => { P._r = { mk: $("#rmk").value, dari: $("#rd").value, sampai: $("#rs").value }; route(1); }; ["rmk", "rd", "rs"].forEach(i => $("#" + i).oninput = set); };

/* ===== LOGIN & DAFTAR ===== */
const authPage = (t, sub, body) => `<section class="auth d-flex align-items-center justify-content-center py-5 px-3"><div class="card shadow border-0 auth-card w-100"><div class="card-body p-4 p-md-5">
  <div class="text-center mb-4"><img src="logo.png" alt="" height="48" class="mb-2"><h1 class="h4 fw-bold">${t}</h1><p class="text-muted mb-0">${sub}</p></div>${body}</div></div></section>`;
const field = (id, label, type, ac, extra) => `<div class="mb-3"><label class="form-label" for="${id}">${label}</label>${extra ? `<div class="input-group has-validation"><input class="form-control" id="${id}" type="${type}" autocomplete="${ac}"><button type="button" class="btn btn-outline-secondary" data-eye="${id}" aria-label="Tampilkan kata sandi"><i class="bi bi-eye"></i></button><div class="invalid-feedback"></div></div>` : `<input class="form-control" id="${id}" type="${type}" autocomplete="${ac}"><div class="invalid-feedback"></div>`}</div>`;
const bad = (id, msg) => { const i = $("#" + id); i.classList.add("is-invalid"); i.parentElement.querySelector(".invalid-feedback").textContent = msg; return false; };
const clearErr = () => { document.querySelectorAll(".is-invalid").forEach(x => x.classList.remove("is-invalid")); const a = $("#err"); if (a) a.classList.add("d-none"); };
const showErr = msg => { const a = $("#err"); a.textContent = msg; a.classList.remove("d-none"); };
const eyes = () => document.querySelectorAll("[data-eye]").forEach(b => b.onclick = () => {
  const i = $("#" + b.dataset.eye), show = i.type == "password";
  i.type = show ? "text" : "password"; b.innerHTML = `<i class="bi bi-eye${show ? "-slash" : ""}"></i>`;
});
const goAfterLogin = () => { const n = P._next; P._next = ""; location.hash = "#/" + (n || "dashboard"); };

P.login = () => authPage("Masuk ke Schedula", "Kelola tugas dan jadwal belajarmu.", `<form id="f" novalidate>
  ${field("u", "Username", "text", "username")}${field("p", "Kata sandi", "password", "current-password", 1)}
  <div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="rem"><label class="form-check-label" for="rem">Ingat saya di perangkat ini</label></div>
  <div class="alert alert-danger py-2 d-none" id="err" role="alert"></div>
  <button class="btn btn-primary w-100" type="submit">Masuk</button></form>
  <p class="text-center small mt-3 mb-0">Belum punya akun? <a href="#/register">Daftar</a></p>
  <div class="alert alert-secondary small mt-3 mb-0">Akun demo: <b>mahasiswa</b> / <b>schedula123</b></div>`);
P.login.init = () => {
  eyes(); $("#u").focus();
  $("#f").onsubmit = async e => {
    e.preventDefault(); clearErr();
    const u = $("#u").value.trim().toLowerCase(), p = $("#p").value; let ok = true;
    if (!u) ok = bad("u", "Username wajib diisi");
    if (!p) ok = bad("p", "Kata sandi wajib diisi");
    if (!ok) return;
    const usr = getUsers()[u];
    if (!usr || usr.hash !== await sha(u, p)) return showErr("Username atau kata sandi salah. Periksa lagi, atau daftar jika belum punya akun.");
    startSession(u, usr.nama, $("#rem").checked); toast("Selamat datang, " + usr.nama); goAfterLogin();
  };
};

P.register = () => authPage("Buat Akun", "Daftar gratis untuk mulai mencatat tugas.", `<form id="f" novalidate>
  ${field("n", "Nama lengkap", "text", "name")}${field("u", "Username", "text", "username")}
  ${field("p", "Kata sandi", "password", "new-password", 1)}${field("p2", "Ulangi kata sandi", "password", "new-password", 1)}
  <div class="alert alert-danger py-2 d-none" id="err" role="alert"></div>
  <button class="btn btn-primary w-100" type="submit">Daftar</button></form>
  <p class="text-center small mt-3 mb-0">Sudah punya akun? <a href="#/login">Masuk</a></p>`);
P.register.init = () => {
  eyes(); $("#n").focus();
  $("#f").onsubmit = async e => {
    e.preventDefault(); clearErr();
    const n = $("#n").value.trim(), u = $("#u").value.trim().toLowerCase(), p = $("#p").value, p2 = $("#p2").value; let ok = true;
    if (!n) ok = bad("n", "Nama lengkap wajib diisi");
    if (!u) ok = bad("u", "Username wajib diisi");
    else if (!/^[a-z0-9_]{4,20}$/.test(u)) ok = bad("u", "Username 4-20 karakter: huruf, angka, atau garis bawah");
    if (!p) ok = bad("p", "Kata sandi wajib diisi");
    else if (p.length < 6) ok = bad("p", "Kata sandi minimal 6 karakter");
    if (p && p2 !== p) ok = bad("p2", "Kata sandi tidak sama");
    if (!ok) return;
    const users = getUsers();
    if (users[u]) return bad("u", "Username sudah dipakai, pilih yang lain");
    users[u] = { nama: n, hash: await sha(u, p) }; setUsers(users);
    startSession(u, n, false); toast("Akun berhasil dibuat"); goAfterLogin();
  };
};

/* ===== PROFIL ===== */
const me = () => (SESSION && getUsers()[SESSION.user]) || {};
const initials = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
const avatar = (u, cls) => u.foto ? `<img class="avatar ${cls || ""}" src="${E(u.foto)}" alt="Foto profil">` : `<span class="avatar ${cls || ""}">${E(initials(u.nama))}</span>`;
function updateSes(p) { // sinkronkan nama di sesi yang sedang aktif
  SESSION = { ...SESSION, ...p };
  const st = sessionStorage.getItem(S_KEY) ? sessionStorage : localStorage;
  try { st.setItem(S_KEY, JSON.stringify(SESSION)); } catch (e) { }
}
function readFoto(file) { // potong persegi + kecilkan ke 192px agar hemat penyimpanan
  return new Promise((res, rej) => {
    const fr = new FileReader(); fr.onerror = rej;
    fr.onload = () => {
      const im = new Image(); im.onerror = rej;
      im.onload = () => {
        const s = Math.min(im.width, im.height), c = document.createElement("canvas");
        c.width = c.height = 192;
        c.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 192, 192);
        res(c.toDataURL("image/jpeg", .85));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
const pf = (id, label, val, type, col) => `<div class="${col || "col-md-6"}"><label class="form-label" for="${id}">${label}</label><input class="form-control" id="${id}" type="${type || "text"}" value="${E(val)}"><div class="invalid-feedback"></div></div>`;

P.profil = () => {
  const u = me(), done = DB.tugas.filter(t => t.st == "Selesai").length;
  const mini = (n, l) => `<div class="col-4"><div class="fw-bold fs-5">${n}</div><div class="small text-muted">${l}</div></div>`;
  return wrap(head("Profil Saya") + `<div class="row g-4">
  <div class="col-lg-4"><div class="card shadow-sm text-center"><div class="card-body p-4">
    ${avatar(u, "avatar-lg")}
    <h3 class="h5 mt-3 mb-0">${E(u.nama)}</h3><div class="text-muted">@${E(SESSION.user)}</div>
    ${u.kampus || u.prodi ? `<div class="small mt-2">${E([u.prodi, u.kampus].filter(Boolean).join(" · "))}${u.semester ? " · Semester " + E(u.semester) : ""}</div>` : ""}
    ${u.bio ? `<p class="small text-muted mt-2 mb-0">${E(u.bio)}</p>` : ""}
    <div class="mt-3"><input type="file" id="foto" accept="image/*" class="d-none">
      <button class="btn btn-sm btn-outline-primary" id="ubahFoto"><i class="bi bi-camera"></i> Ganti foto</button>
      ${u.foto ? `<button class="btn btn-sm btn-outline-secondary ms-1" id="hapusFoto">Hapus</button>` : ""}</div>
    <hr><div class="row g-2">${mini(done + "/" + DB.tugas.length, "Tugas selesai")}${mini(DB.mk.length, "Mata kuliah")}${mini(DB.jad.length, "Jadwal")}</div>
  </div></div></div>
  <div class="col-lg-8">
    <div class="card shadow-sm mb-4"><div class="card-body p-4"><h3 class="h5 mb-3">Informasi Pribadi</h3>
      <form id="fp" novalidate><div class="row g-3">
        ${pf("pf_nama", "Nama lengkap", u.nama || "")}${pf("pf_email", "Email", u.email || "", "email")}
        ${pf("pf_kampus", "Kampus / Universitas", u.kampus || "")}${pf("pf_prodi", "Program studi", u.prodi || "")}
        ${pf("pf_sem", "Semester", u.semester || "", "number")}
        <div class="col-md-6"><label class="form-label" for="pf_user">Username</label><input class="form-control" id="pf_user" value="${E(SESSION.user)}" disabled></div>
        <div class="col-12"><label class="form-label" for="pf_bio">Bio singkat</label><textarea class="form-control" id="pf_bio" rows="3" maxlength="200">${E(u.bio || "")}</textarea></div>
      </div><div class="text-end mt-3"><button class="btn btn-primary" type="submit">Simpan Perubahan</button></div></form>
    </div></div>
    <div class="card shadow-sm mb-4"><div class="card-body p-4"><h3 class="h5 mb-3">Ganti Kata Sandi</h3>
      <form id="fw" novalidate>${field("pw0", "Kata sandi lama", "password", "current-password", 1)}${field("pw1", "Kata sandi baru", "password", "new-password", 1)}${field("pw2", "Ulangi kata sandi baru", "password", "new-password", 1)}
      <div class="text-end"><button class="btn btn-primary" type="submit">Ganti Kata Sandi</button></div></form>
    </div></div>
    <div class="card border-danger shadow-sm"><div class="card-body p-4 d-flex flex-wrap gap-3 align-items-center">
      <div class="me-auto"><h3 class="h5 text-danger mb-1">Hapus Akun</h3><div class="small text-muted">Akun beserta semua mata kuliah, tugas, dan jadwal akan dihapus permanen.</div></div>
      <button class="btn btn-outline-danger" id="hapusAkun"><i class="bi bi-trash"></i> Hapus Akun</button>
    </div></div>
  </div></div>`);
};
P.profil.init = () => {
  eyes();
  const upd = patch => { const us = getUsers(); us[SESSION.user] = { ...us[SESSION.user], ...patch }; setUsers(us); if (patch.nama) updateSes({ nama: patch.nama }); };
  $("#ubahFoto").onclick = () => $("#foto").click();
  $("#foto").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith("image/")) return toast("File harus berupa gambar", 1);
    if (f.size > 5 * 1024 * 1024) return toast("Ukuran foto maksimal 5 MB", 1);
    try { upd({ foto: await readFoto(f) }); toast("Foto profil diperbarui"); route(); } catch (x) { toast("Gagal membaca gambar", 1); }
  };
  const hf = $("#hapusFoto"); if (hf) hf.onclick = () => { upd({ foto: "" }); toast("Foto profil dihapus"); route(); };

  $("#fp").onsubmit = e => {
    e.preventDefault(); clearErr();
    const v = id => $("#" + id).value.trim(); let ok = true;
    if (!v("pf_nama")) ok = bad("pf_nama", "Nama wajib diisi");
    if (v("pf_email") && !/^\S+@\S+\.\S+$/.test(v("pf_email"))) ok = bad("pf_email", "Format email tidak valid");
    if (v("pf_sem") && !(+v("pf_sem") >= 1 && +v("pf_sem") <= 14)) ok = bad("pf_sem", "Semester antara 1 sampai 14");
    if (!ok) return;
    upd({ nama: v("pf_nama"), email: v("pf_email"), kampus: v("pf_kampus"), prodi: v("pf_prodi"), semester: v("pf_sem"), bio: v("pf_bio") });
    toast("Profil berhasil disimpan"); route();
  };

  $("#fw").onsubmit = async e => {
    e.preventDefault(); clearErr();
    const o = $("#pw0").value, n = $("#pw1").value, c = $("#pw2").value; let ok = true;
    if (!o) ok = bad("pw0", "Kata sandi lama wajib diisi");
    if (!n) ok = bad("pw1", "Kata sandi baru wajib diisi");
    else if (n.length < 6) ok = bad("pw1", "Kata sandi minimal 6 karakter");
    else if (n === o) ok = bad("pw1", "Kata sandi baru harus berbeda dari yang lama");
    if (n && c !== n) ok = bad("pw2", "Kata sandi tidak sama");
    if (!ok) return;
    if (me().hash !== await sha(SESSION.user, o)) return bad("pw0", "Kata sandi lama salah");
    upd({ hash: await sha(SESSION.user, n) }); $("#fw").reset(); toast("Kata sandi berhasil diganti");
  };

  $("#hapusAkun").onclick = () => {
    const { el, m } = modal("Hapus Akun", `<p>Semua data akun ini akan dihapus permanen dan tidak bisa dikembalikan.</p><label class="form-label" for="dpw">Masukkan kata sandi untuk konfirmasi</label><input class="form-control" id="dpw" type="password" autocomplete="current-password"><div class="invalid-feedback"></div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-danger" id="ya">Hapus Akun</button>`);
    el.querySelector("#ya").onclick = async () => {
      const i = el.querySelector("#dpw");
      if (me().hash !== await sha(SESSION.user, i.value)) { i.classList.add("is-invalid"); i.nextElementSibling.textContent = "Kata sandi salah"; return; }
      const us = getUsers(), k = SESSION.user; delete us[k]; setUsers(us);
      try { localStorage.removeItem("schedula:" + k); } catch (x) { }
      m.hide(); logout(); toast("Akun berhasil dihapus");
    };
  };
};

/* ===== PENGINGAT / NOTIFIKASI ===== */
/* Dihitung langsung dari data tugas & jadwal; status "dibaca" disimpan di DB.read */
const dayDiff = s => Math.round((new Date(s + "T00:00") - new Date(d0(0) + "T00:00")) / 864e5);
const hmin = s => { const [h, m] = s.split(":"); return +h * 60 + +m; };
function buildNotifs() {
  const out = [];
  if (!DB || !DB.set.on) return out;
  const c = DB.set, now = new Date(), nowM = now.getHours() * 60 + now.getMinutes(), td = d0(0);
  if (c.tugas) DB.tugas.filter(t => t.st != "Selesai").forEach(t => {
    const n = dayDiff(t.dl); if (n > +c.hari) return;
    let lv, label, icon, push = true;
    if (n < 0) { lv = 0; label = `Terlambat ${-n} hari`; icon = "exclamation-octagon-fill"; }
    else if (n == 0) { lv = 0; label = "Deadline hari ini"; icon = "alarm-fill"; }
    else if (n == 1) { lv = 1; label = "Deadline besok"; icon = "alarm"; }
    else { lv = 2; label = `Deadline ${n} hari lagi`; icon = "hourglass-split"; push = false; }
    out.push({ key: `t${t.id}:${td}`, lv, icon, label, push, o: n, title: t.judul, text: `${mkName(t.mk)} · ${fmt(t.dl)}`, href: "#/tugas" });
  });
  if (c.jadwal) DB.jad.forEach(j => [0, 1].forEach(n => {
    if (!onDate(j, d0(n))) return;
    const s = hmin(j.mulai), e = hmin(j.selesai), b = { title: j.topik, text: `${mkName(j.mk)} · ${j.mulai}-${j.selesai}`, href: "#/jadwal" };
    if (n == 1) out.push({ ...b, key: `j${j.id}:${d0(n)}:b`, lv: 2, icon: "calendar-event", label: "Besok", push: false, o: 1000 + s });
    else if (nowM >= e) return;
    else if (nowM >= s) out.push({ ...b, key: `j${j.id}:${d0(n)}:on`, lv: 1, icon: "play-circle-fill", label: "Sedang berlangsung", push: false, o: s });
    else if (s - nowM <= +c.menit) out.push({ ...b, key: `j${j.id}:${d0(n)}:soon`, lv: 0, icon: "bell-fill", label: `Mulai ${s - nowM} menit lagi`, push: true, o: s });
    else out.push({ ...b, key: `j${j.id}:${d0(n)}:t`, lv: 2, icon: "calendar-check", label: `Hari ini ${j.mulai}`, push: false, o: s });
  }));
  return out.sort((a, b) => a.lv - b.lv || a.o - b.o);
}
const unreadCount = () => DB ? buildNotifs().filter(n => !DB.read[n.key]).length : 0;
function setBadge(n) {
  ["#nbadge", "#nbadge2"].forEach(s => { const b = $(s); if (!b) return; b.textContent = n > 99 ? "99+" : n; b.classList.toggle("d-none", !n); });
}
function pushAlert(title, text) { // toast di dalam aplikasi + notifikasi browser (jika diizinkan)
  toast(title, 2, 6000);
  if (DB.set.browser && "Notification" in window && Notification.permission == "granted") {
    try { new Notification("Schedula", { body: text ? title + "\n" + text : title, icon: "logo.png" }); } catch (e) { }
  }
}
let LAST = "";
function checkNotifs() { // dipanggil berkala; tiap pengingat hanya "didorong" sekali
  if (!SESSION || !DB) return;
  const L = buildNotifs(), fresh = L.filter(n => n.push && !DB.pushed[n.key]);
  const sig = L.map(n => n.key + n.label + (DB.read[n.key] ? 1 : 0)).join("|");
  if (fresh.length) {
    fresh.forEach(n => DB.pushed[n.key] = d0(0));
    try { localStorage.setItem(dbKey(), JSON.stringify(DB)); } catch (e) { }
    if (fresh.length > 3) pushAlert(`Ada ${fresh.length} pengingat baru`, "Buka halaman Notifikasi untuk melihatnya.");
    else fresh.forEach(n => pushAlert(`${n.label}: ${n.title}`, n.text));
  }
  setBadge(L.filter(n => !DB.read[n.key]).length);
  if (sig !== LAST) { const had = LAST !== ""; LAST = sig; if (had && location.hash == "#/notifikasi") route(1); }
}
const remind = () => { const n = unreadCount(); return n ? `<div class="alert alert-warning d-flex align-items-center gap-2"><i class="bi bi-bell-fill"></i><div class="me-auto">Ada <b>${n}</b> pengingat yang belum dibaca.</div><a class="btn btn-sm btn-warning" href="#/notifikasi">Lihat</a></div>` : ""; };

P.notifikasi = () => {
  const L = buildNotifs(), c = DB.set, un = L.filter(n => !DB.read[n.key]).length, C = ["danger", "warning", "info"];
  const sw = (id, l, on, dis) => `<div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" role="switch" id="${id}" ${on ? "checked" : ""} ${dis ? "disabled" : ""}><label class="form-check-label" for="${id}">${l}</label></div>`;
  const op = (arr, v, suf) => arr.map(x => `<option value="${x}" ${x == v ? "selected" : ""}>${x} ${suf}</option>`).join("");
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  const items = L.map(n => { const r = DB.read[n.key]; return `<div class="list-group-item d-flex gap-3 align-items-start ${r ? "text-muted" : ""}">
    <i class="bi bi-${n.icon} fs-4 text-${C[n.lv]}"></i>
    <div class="flex-grow-1 min-w-0"><div class="d-flex flex-wrap gap-2 align-items-center"><span class="badge text-bg-${C[n.lv]}">${E(n.label)}</span>${r ? "" : '<span class="badge rounded-pill text-bg-primary">Baru</span>'}</div>
      <div class="fw-semibold mt-1">${E(n.title)}</div><div class="small">${E(n.text)}</div></div>
    <div class="btn-aksi"><a class="btn btn-sm btn-outline-secondary" href="${n.href}">Buka</a>${r ? "" : ` <button class="btn btn-sm btn-outline-primary" data-k="${E(n.key)}" title="Tandai dibaca" aria-label="Tandai dibaca"><i class="bi bi-check2"></i></button>`}</div></div>`; }).join("");
  const list = L.length ? `<div class="list-group shadow-sm">${items}</div>`
    : `<div class="card shadow-sm"><div class="card-body text-center text-muted py-5"><i class="bi bi-bell-slash display-5"></i><p class="mt-3 mb-0">${c.on ? "Tidak ada pengingat saat ini. Semua aman!" : "Pengingat sedang dimatikan."}</p></div></div>`;
  return wrap(head("Notifikasi", un ? `<button class="btn btn-outline-primary" id="readAll"><i class="bi bi-check2-all"></i> Tandai semua dibaca</button>` : "") +
    `<div class="row g-4"><div class="col-lg-7">${list}</div>
    <div class="col-lg-5"><div class="card shadow-sm"><div class="card-body p-4"><h3 class="h5 mb-3">Pengaturan Pengingat</h3>
      ${sw("sOn", "Aktifkan pengingat", c.on)}<hr>
      ${sw("sTugas", "Pengingat deadline tugas", c.tugas, !c.on)}
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3 ms-4 small"><span>Ingatkan mulai</span><select class="form-select form-select-sm w-auto" id="sHari" ${!c.on || !c.tugas ? "disabled" : ""}>${op([1, 2, 3, 5, 7], c.hari, "hari")}</select><span>sebelum deadline</span></div>
      ${sw("sJad", "Pengingat jadwal belajar", c.jadwal, !c.on)}
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3 ms-4 small"><span>Ingatkan</span><select class="form-select form-select-sm w-auto" id="sMen" ${!c.on || !c.jadwal ? "disabled" : ""}>${op([10, 15, 30, 60], c.menit, "menit")}</select><span>sebelum mulai</span></div>
      <hr>${sw("sBr", "Notifikasi browser", c.browser, !c.on || perm == "unsupported")}
      <div class="small text-muted ms-4 mb-3">${perm == "unsupported" ? "Browser ini tidak mendukung notifikasi." : perm == "denied" ? "Izin diblokir. Aktifkan lewat pengaturan situs di browser." : "Pengingat tampil sebagai notifikasi sistem."}</div>
      <button class="btn btn-sm btn-outline-secondary" id="tes"><i class="bi bi-send"></i> Kirim notifikasi uji</button>
      <div class="small text-muted mt-3">Pengingat muncul selama Schedula terbuka di browser (tab boleh di latar belakang).</div>
    </div></div></div></div>`);
};
P.notifikasi.init = () => {
  document.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { DB.read[b.dataset.k] = d0(0); save(); route(1); });
  const ra = $("#readAll"); if (ra) ra.onclick = () => { buildNotifs().forEach(n => DB.read[n.key] = d0(0)); save(); route(1); };
  [["sOn", "on"], ["sTugas", "tugas"], ["sHari", "hari"], ["sJad", "jadwal"], ["sMen", "menit"]].forEach(([id, k]) => $("#" + id).onchange = e => {
    DB.set[k] = e.target.type == "checkbox" ? e.target.checked : +e.target.value; save(); route(1);
  });
  $("#sBr").onchange = async e => {
    if (e.target.checked) {
      let p = Notification.permission;
      if (p == "default") p = await Notification.requestPermission();
      if (p != "granted") { e.target.checked = false; DB.set.browser = false; save(); route(1); return toast("Izin notifikasi tidak diberikan", 1); }
    }
    DB.set.browser = e.target.checked; save(); toast(DB.set.browser ? "Notifikasi browser aktif" : "Notifikasi browser dimatikan"); route(1);
  };
  $("#tes").onclick = () => pushAlert("Ini notifikasi uji", "Pengingat Schedula berfungsi dengan baik.");
};

/* Sidebar: tampilkan menu sesuai status login */
function renderNav() {
  document.querySelectorAll("[data-auth]").forEach(el => el.classList.toggle("d-none", !SESSION));
  const u = me();
  $("#sideUser").innerHTML = SESSION
    ? `<div class="side-user">
        <a href="#/profil" class="d-flex align-items-center gap-2 flex-grow-1 min-w-0" title="Lihat profil">${avatar(u)}
          <div class="min-w-0"><div class="fw-semibold text-truncate small">${E(SESSION.nama)}</div><div class="text-white-50 text-truncate" style="font-size:.75rem">@${E(SESSION.user)}</div></div></a>
        <button class="side-logout" id="logout" title="Keluar" aria-label="Keluar"><i class="bi bi-box-arrow-right"></i></button></div>`
    : `<a class="btn btn-primary w-100 mb-2" href="#/login">Masuk</a><a class="btn btn-outline-light w-100" href="#/register">Daftar</a>`;
  const lo = $("#logout"); if (lo) lo.onclick = logout;
  setBadge(SESSION ? unreadCount() : 0);
}

/* ===== ROUTER ===== */
function route(keep) {
  const k = location.hash.replace(/^#\/?/, "");
  const pg = typeof P[k] == "function" ? k : "";
  /* Penjaga halaman: hanya Beranda, Masuk, dan Daftar yang terbuka tanpa login */
  if (!SESSION && !["", "login", "register"].includes(pg)) { P._next = pg; toast("Masuk dulu untuk membuka halaman ini", 1); location.replace("#/login"); return; }
  if (SESSION && (pg == "login" || pg == "register")) { location.replace("#/dashboard"); return; }
  renderNav();
  const y = scrollY, fe = document.activeElement && document.activeElement.id;
  $("#app").innerHTML = P[pg]();
  document.querySelectorAll(".side-link").forEach(a => a.classList.toggle("active", a.dataset.r == pg));
  if (P[pg].init) P[pg].init();
  if (keep) {
    scrollTo(0, y);
    const el = fe && document.getElementById(fe);
    if (el && el.focus) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { } }
  } else scrollTo(0, 0);
}
addEventListener("hashchange", () => { route(); const c = bootstrap.Offcanvas.getInstance($("#sidebar")); if (c) c.hide(); checkNotifs(); });
seedUsers(); route(); checkNotifs();
setInterval(checkNotifs, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkNotifs(); });