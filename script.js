/* Schedula - logika front-end (data disimpan di localStorage) */
const $ = s => document.querySelector(s);
const E = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const d0 = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const TODAY = d0(0);
const fmt = s => s ? new Date(s + "T00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
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
let DB; try { DB = JSON.parse(localStorage.getItem("schedula")); } catch (e) { }
DB = DB || JSON.parse(JSON.stringify(SEED));
const save = () => { try { localStorage.setItem("schedula", JSON.stringify(DB)); } catch (e) { } };
const nid = a => a.reduce((m, x) => Math.max(m, x.id), 0) + 1;
const mkName = id => (DB.mk.find(m => m.id == id) || {}).nama || "-";
const mkOpts = () => DB.mk.map(m => [m.id, m.nama]);

/* ===== KOMPONEN BOOTSTRAP ===== */
function toast(msg, err) {
  const el = document.createElement("div");
  el.className = "toast align-items-center border-0 text-bg-" + (err ? "danger" : "success");
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${E(msg)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  $("#toasts").append(el);
  el.addEventListener("hidden.bs.toast", () => el.remove());
  new bootstrap.Toast(el, { delay: 2500 }).show();
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
    return `<div class="mb-3"><label class="form-label">${f.l}${f.r ? ' <span class="text-danger">*</span>' : ""}</label>${i}<div class="invalid-feedback"></div></div>`;
  }).join("");
  const { el, m } = modal(title, body, `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" id="simpan">Simpan</button>`);
  el.querySelector("#simpan").onclick = () => {
    const r = {}; let ok = true;
    const err = (k, msg) => { const inp = el.querySelector(`[name=${k}]`); inp.classList.add("is-invalid"); inp.nextElementSibling.textContent = msg; ok = false; };
    el.querySelectorAll(".is-invalid").forEach(x => x.classList.remove("is-invalid"));
    fields.forEach(f => { r[f.k] = el.querySelector(`[name=${f.k}]`).value.trim(); if (f.r && !r[f.k]) err(f.k, f.l + " wajib diisi"); });
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
  const td = DB.jad.filter(j => j.tgl == TODAY).sort((a, b) => a.mulai.localeCompare(b.mulai));
  return wrap(head("Dashboard") + `<div class="row g-3 mb-4">${statCard(open.length, "Tugas belum selesai", "primary")}${statCard(near.length, "Deadline 7 hari ke depan", "warning")}${statCard(late.length, "Lewat deadline", "danger")}${statCard(td.length, "Jadwal belajar hari ini", "success")}</div>
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
  const q = (P._q || "").toLowerCase(), L = DB.jad.filter(j => (j.topik + mkName(j.mk) + j.tgl).toLowerCase().includes(q)).sort((a, b) => (a.tgl + a.mulai).localeCompare(b.tgl + b.mulai));
  return wrap(head("Jadwal Belajar", `<input class="form-control w-auto" id="q" placeholder="Cari topik / mata kuliah" value="${E(P._q || "")}">${addBtn}`) +
    tbl(["Tanggal", "Waktu", "Mata Kuliah", "Topik", "Aksi"], L.map(j => `<tr><td>${fmt(j.tgl)}${j.tgl == TODAY ? ' <span class="badge text-bg-info">Hari ini</span>' : ""}</td><td>${j.mulai}-${j.selesai}</td><td>${E(mkName(j.mk))}</td><td>${E(j.topik)}</td>${aksi(j.id)}</tr>`).join("")));
};
P.jadwal.init = () => {
  const F = () => [{ k: "mk", l: "Mata Kuliah", t: "select", o: mkOpts(), r: 1 }, { k: "tgl", l: "Tanggal", t: "date", r: 1, def: TODAY }, { k: "mulai", l: "Jam Mulai", t: "time", r: 1 }, { k: "selesai", l: "Jam Selesai", t: "time", r: 1 }, { k: "topik", l: "Topik", r: 1 }];
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

/* ===== ROUTER ===== */
function route(keep) {
  const k = location.hash.replace(/^#\/?/, "");
  const pg = typeof P[k] == "function" ? k : "";
  const y = scrollY, fe = document.activeElement && document.activeElement.id;
  $("#app").innerHTML = P[pg]();
  document.querySelectorAll(".nav-link").forEach(a => a.classList.toggle("active", a.dataset.r == pg));
  if (P[pg].init) P[pg].init();
  if (keep) {
    scrollTo(0, y);
    const el = fe && document.getElementById(fe);
    if (el && el.focus) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { } }
  } else scrollTo(0, 0);
}
addEventListener("hashchange", () => { route(); const c = bootstrap.Collapse.getInstance($("#navbarNav")); if (c) c.hide(); });
route();
