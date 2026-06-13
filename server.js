const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const XLSX = require("xlsx");
const DB = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
fs.mkdirSync(path.join(__dirname, "uploads", "ktp"), { recursive: true });

const db = new DB(path.join(__dirname, "data", "alterentcar_online_v4.db"));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads", "ktp")),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "-"))
  })
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public"), {
  index: false,
  setHeaders: (res, filePath) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
}));

// ROUTE HALAMAN UTAMA - penting untuk Render supaya CSS/JS admin terbaca benar
app.get("/", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/customer", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "customer", "index.html"));
});

app.get("/customer/", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "customer", "index.html"));
});

// Paksa file penting dikirim dengan MIME yang benar
app.get("/css/style.css", (req, res) => {
  res.type("text/css");
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "css", "style.css"));
});

app.get("/js/app.js", (req, res) => {
  res.type("application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "js", "app.js"));
});

app.get("/js/customer.js", (req, res) => {
  res.type("application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "js", "customer.js"));
});

// Reset service worker lama agar browser tidak memakai cache PWA lama
app.get("/sw.js", (req, res) => {
  res.type("application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.send(`
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {});
  `);
});


db.exec(`
CREATE TABLE IF NOT EXISTS setting(id INTEGER PRIMARY KEY CHECK(id=1), nama_usaha TEXT, wa_admin TEXT, alamat TEXT);
CREATE TABLE IF NOT EXISTS admin(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT);
CREATE TABLE IF NOT EXISTS armada(id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT, plat TEXT, tipe TEXT, tahun TEXT, harga INTEGER, status TEXT DEFAULT 'Ready', deskripsi TEXT);
CREATE TABLE IF NOT EXISTS sopir(id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT, no_hp TEXT, status TEXT DEFAULT 'Aktif');
CREATE TABLE IF NOT EXISTS customer(id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT, no_hp TEXT, alamat TEXT, no_identitas TEXT, foto_ktp TEXT, catatan TEXT);
CREATE TABLE IF NOT EXISTS sewa(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT UNIQUE,
  sumber TEXT,
  tgl_booking TEXT,
  customer_id INTEGER,
  armada_id INTEGER,
  sopir_id INTEGER,
  tgl_mulai TEXT,
  tgl_selesai TEXT,
  durasi INTEGER,
  harga_harian INTEGER,
  biaya_sopir INTEGER DEFAULT 0,
  biaya_bbm INTEGER DEFAULT 0,
  biaya_tol INTEGER DEFAULT 0,
  biaya_lain INTEGER DEFAULT 0,
  diskon INTEGER DEFAULT 0,
  total INTEGER,
  dibayar INTEGER DEFAULT 0,
  status_bayar TEXT,
  status_sewa TEXT,
  catatan TEXT
);
CREATE TABLE IF NOT EXISTS pengeluaran(id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT, kategori TEXT, armada_id INTEGER, keterangan TEXT, nominal INTEGER);
`);

function seed() {
  if (!db.prepare("SELECT COUNT(*) t FROM setting").get().t) {
    db.prepare("INSERT INTO setting VALUES(1,?,?,?)").run("AlteRentCar", "628980808015", "Semarang, Jawa Tengah, Indonesia");
  }
  if (!db.prepare("SELECT COUNT(*) t FROM admin").get().t) {
    db.prepare("INSERT INTO admin(username,password) VALUES('admin','admin123')").run();
  }
  if (!db.prepare("SELECT COUNT(*) t FROM armada").get().t) {
    const q = db.prepare("INSERT INTO armada(nama,plat,tipe,tahun,harga,status,deskripsi) VALUES(?,?,?,?,?,?,?)");
    q.run("Avanza New Matic", "H 0001 AA", "MPV", "2023", 350000, "Ready", "Cocok untuk keluarga.");
    q.run("Brio New Matic", "H 0002 AA", "City Car", "2025", 300000, "Ready", "Irit dan nyaman untuk dalam kota.");
    q.run("Innova Reborn New Matic", "H 0003 AA", "Premium MPV", "2020", 500000, "Ready", "Nyaman untuk luar kota.");
    q.run("Calya New Matic", "H 0004 AA", "City Car", "2019", 300000, "Ready", "Mobil ekonomis dan nyaman.");
  }
  if (!db.prepare("SELECT COUNT(*) t FROM sopir").get().t) {
    db.prepare("INSERT INTO sopir(nama,no_hp,status) VALUES('Sopir Utama','08xxxxxxxxxx','Aktif')").run();
  }
}
seed();

const today = () => new Date().toISOString().slice(0, 10);
const rupiah = n => "Rp " + Number(n || 0).toLocaleString("id-ID");

function hari(a, b) {
  let d = Math.ceil((new Date(b) - new Date(a)) / 86400000);
  return d <= 0 ? 1 : d;
}

function kode() {
  let ym = today().slice(0, 7).replace("-", "");
  let n = db.prepare("SELECT COUNT(*) t FROM sewa WHERE substr(tgl_booking,1,7)=?").get(today().slice(0, 7)).t + 1;
  return "ALT-" + ym + "-" + String(n).padStart(4, "0");
}

function statusBayar(total, dibayar) {
  if (Number(dibayar) >= Number(total)) return "Lunas";
  if (Number(dibayar) > 0) return "DP";
  return "Belum Bayar";
}

function setting() {
  return db.prepare("SELECT * FROM setting WHERE id=1").get();
}

function detail(id) {
  return db.prepare(`
    SELECT s.*, c.nama customer, c.no_hp hp, c.alamat alamat_customer, c.no_identitas, c.foto_ktp,
           a.nama armada, a.plat, a.tipe, a.tahun, sp.nama sopir, sp.no_hp sopir_hp
    FROM sewa s
    JOIN customer c ON s.customer_id=c.id
    JOIN armada a ON s.armada_id=a.id
    LEFT JOIN sopir sp ON s.sopir_id=sp.id
    WHERE s.id=?
  `).get(id);
}

/* PUBLIC */
app.get("/api/public/setting", (req, res) => res.json(setting()));
app.get("/api/public/armada", (req, res) => res.json(db.prepare("SELECT * FROM armada ORDER BY id DESC").all()));

app.post("/api/public/booking", upload.single("foto_ktp"), (req, res) => {
  const b = req.body;
  if (!b.nama || !b.no_hp || !b.armada_id || !b.tgl_mulai || !b.tgl_selesai) return res.status(400).json({ error: "Data belum lengkap" });

  const a = db.prepare("SELECT * FROM armada WHERE id=?").get(b.armada_id);
  if (!a) return res.status(404).json({ error: "Armada tidak ditemukan" });

  const dur = hari(b.tgl_mulai, b.tgl_selesai);
  const sop = b.pakai_sopir === "Ya" ? Number(b.biaya_sopir || 0) : 0;
  const total = dur * Number(a.harga || 0) + sop;
  const kd = kode();

  const trx = db.transaction(() => {
    const c = db.prepare("INSERT INTO customer(nama,no_hp,alamat,no_identitas,foto_ktp,catatan) VALUES(?,?,?,?,?,?)").run(
      b.nama, b.no_hp, b.alamat || "", b.no_identitas || "", req.file ? "/uploads/ktp/" + req.file.filename : "", "Booking dari website"
    );

    db.prepare(`
      INSERT INTO sewa(kode,sumber,tgl_booking,customer_id,armada_id,tgl_mulai,tgl_selesai,durasi,harga_harian,biaya_sopir,total,dibayar,status_bayar,status_sewa,catatan)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(kd, "Website", today(), c.lastInsertRowid, b.armada_id, b.tgl_mulai, b.tgl_selesai, dur, Number(a.harga || 0), sop, total, 0, "Belum Bayar", "Booking", b.catatan || "");
  });
  trx();

  const s = setting();
  const text = encodeURIComponent(`Halo Admin ${s.nama_usaha}, saya booking rental mobil.\n\nKode: ${kd}\nNama: ${b.nama}\nWA: ${b.no_hp}\nMobil: ${a.nama}\nTanggal: ${b.tgl_mulai} s/d ${b.tgl_selesai}\nTotal: ${rupiah(total)}`);
  res.json({ success: true, kode: kd, total, wa: `https://wa.me/${s.wa_admin}?text=${text}` });
});

/* ADMIN API */
app.post("/api/login", (req, res) => {
  const u = db.prepare("SELECT * FROM admin WHERE username=? AND password=?").get(req.body.username, req.body.password);
  if (!u) return res.status(401).json({ error: "Login salah" });
  res.json({ success: true });
});

app.get("/api/setting", (req, res) => res.json(setting()));
app.put("/api/setting", (req, res) => {
  db.prepare("UPDATE setting SET nama_usaha=?,wa_admin=?,alamat=? WHERE id=1").run(req.body.nama_usaha, req.body.wa_admin, req.body.alamat);
  res.json({ success: true });
});

app.get("/api/dashboard", (req, res) => {
  const bl = req.query.bulan;
  const p = bl ? [bl] : [];
  const w = bl ? "WHERE substr(tgl_booking,1,7)=?" : "";
  const wk = bl ? "WHERE substr(tanggal,1,7)=?" : "";
  const s = db.prepare(`SELECT COUNT(*) jumlah, COALESCE(SUM(total),0) omzet, COALESCE(SUM(dibayar),0) masuk, COALESCE(SUM(total-dibayar),0) piutang FROM sewa ${w}`).get(...p);
  const keluar = db.prepare(`SELECT COALESCE(SUM(nominal),0) total FROM pengeluaran ${wk}`).get(...p).total;
  res.json({ ...s, pengeluaran: keluar, laba: s.omzet - keluar, booking_web: db.prepare("SELECT COUNT(*) t FROM sewa WHERE sumber='Website' AND status_sewa='Booking'").get().t, armada: db.prepare("SELECT status,COUNT(*) total FROM armada GROUP BY status").all() });
});

app.get("/api/armada", (req, res) => res.json(db.prepare("SELECT * FROM armada ORDER BY id DESC").all()));
app.post("/api/armada", (req, res) => {
  const b = req.body;
  const r = db.prepare("INSERT INTO armada(nama,plat,tipe,tahun,harga,status,deskripsi) VALUES(?,?,?,?,?,?,?)").run(b.nama, b.plat, b.tipe, b.tahun, Number(b.harga || 0), b.status || "Ready", b.deskripsi || "");
  res.json({ id: r.lastInsertRowid });
});
app.put("/api/armada/:id", (req, res) => {
  const b = req.body;
  db.prepare("UPDATE armada SET nama=?,plat=?,tipe=?,tahun=?,harga=?,status=?,deskripsi=? WHERE id=?").run(b.nama, b.plat, b.tipe, b.tahun, Number(b.harga || 0), b.status, b.deskripsi, req.params.id);
  res.json({ success: true });
});
app.delete("/api/armada/:id", (req, res) => { db.prepare("DELETE FROM armada WHERE id=?").run(req.params.id); res.json({ success: true }); });

app.get("/api/sopir", (req, res) => res.json(db.prepare("SELECT * FROM sopir ORDER BY id DESC").all()));
app.post("/api/sopir", (req, res) => { const r = db.prepare("INSERT INTO sopir(nama,no_hp,status) VALUES(?,?,?)").run(req.body.nama, req.body.no_hp, req.body.status || "Aktif"); res.json({ id: r.lastInsertRowid }); });
app.delete("/api/sopir/:id", (req, res) => { db.prepare("DELETE FROM sopir WHERE id=?").run(req.params.id); res.json({ success: true }); });

app.get("/api/customer", (req, res) => res.json(db.prepare("SELECT * FROM customer ORDER BY id DESC").all()));
app.post("/api/customer", upload.single("foto_ktp"), (req, res) => {
  const b = req.body;
  const r = db.prepare("INSERT INTO customer(nama,no_hp,alamat,no_identitas,foto_ktp,catatan) VALUES(?,?,?,?,?,?)").run(b.nama, b.no_hp, b.alamat, b.no_identitas, req.file ? "/uploads/ktp/" + req.file.filename : "", b.catatan || "");
  res.json({ id: r.lastInsertRowid });
});
app.delete("/api/customer/:id", (req, res) => { db.prepare("DELETE FROM customer WHERE id=?").run(req.params.id); res.json({ success: true }); });

app.get("/api/sewa", (req, res) => {
  let bl = req.query.bulan;
  let sql = `SELECT s.*, c.nama customer, c.no_hp hp, a.nama armada, a.plat FROM sewa s JOIN customer c ON s.customer_id=c.id JOIN armada a ON s.armada_id=a.id`;
  const p = [];
  if (bl) { sql += " WHERE substr(s.tgl_booking,1,7)=?"; p.push(bl); }
  sql += " ORDER BY s.id DESC";
  res.json(db.prepare(sql).all(...p));
});
app.get("/api/sewa/:id", (req, res) => res.json(detail(req.params.id) || {}));

app.post("/api/sewa", (req, res) => {
  const b = req.body;
  if (!b.customer_id || !b.armada_id || !b.tgl_mulai || !b.tgl_selesai) return res.status(400).json({ error: "Customer, armada, dan tanggal wajib diisi" });

  const dur = hari(b.tgl_mulai, b.tgl_selesai);
  const total = dur * Number(b.harga_harian || 0) + Number(b.biaya_sopir || 0) + Number(b.biaya_bbm || 0) + Number(b.biaya_tol || 0) + Number(b.biaya_lain || 0) - Number(b.diskon || 0);
  const dibayar = Number(b.dibayar || 0);
  const kd = kode();

  const r = db.prepare(`
    INSERT INTO sewa(kode,sumber,tgl_booking,customer_id,armada_id,tgl_mulai,tgl_selesai,durasi,harga_harian,biaya_sopir,biaya_bbm,biaya_tol,biaya_lain,diskon,total,dibayar,status_bayar,status_sewa,catatan)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(kd, "Admin", today(), b.customer_id, b.armada_id, b.tgl_mulai, b.tgl_selesai, dur, Number(b.harga_harian || 0), Number(b.biaya_sopir || 0), Number(b.biaya_bbm || 0), Number(b.biaya_tol || 0), Number(b.biaya_lain || 0), Number(b.diskon || 0), total, dibayar, statusBayar(total, dibayar), b.status_sewa || "Booking", b.catatan || "");

  res.json({ id: r.lastInsertRowid, kode: kd });
});

app.put("/api/sewa/:id", (req, res) => {
  const o = db.prepare("SELECT * FROM sewa WHERE id=?").get(req.params.id);
  const b = req.body;
  if (!o) return res.status(404).json({ error: "Data tidak ditemukan" });

  const dur = hari(b.tgl_mulai || o.tgl_mulai, b.tgl_selesai || o.tgl_selesai);
  const total = dur * Number(b.harga_harian ?? o.harga_harian) + Number(b.biaya_sopir ?? o.biaya_sopir) + Number(b.biaya_bbm ?? o.biaya_bbm) + Number(b.biaya_tol ?? o.biaya_tol) + Number(b.biaya_lain ?? o.biaya_lain) - Number(b.diskon ?? o.diskon);
  const dib = Number(b.dibayar ?? o.dibayar);

  db.prepare(`
    UPDATE sewa SET tgl_mulai=?,tgl_selesai=?,durasi=?,harga_harian=?,biaya_sopir=?,biaya_bbm=?,biaya_tol=?,biaya_lain=?,diskon=?,total=?,dibayar=?,status_bayar=?,status_sewa=?,catatan=? WHERE id=?
  `).run(b.tgl_mulai || o.tgl_mulai, b.tgl_selesai || o.tgl_selesai, dur, Number(b.harga_harian ?? o.harga_harian), Number(b.biaya_sopir ?? o.biaya_sopir), Number(b.biaya_bbm ?? o.biaya_bbm), Number(b.biaya_tol ?? o.biaya_tol), Number(b.biaya_lain ?? o.biaya_lain), Number(b.diskon ?? o.diskon), total, dib, statusBayar(total, dib), b.status_sewa || o.status_sewa, b.catatan ?? o.catatan, req.params.id);
  res.json({ success: true });
});

app.put("/api/sewa/:id/bayar", (req, res) => {
  const o = db.prepare("SELECT * FROM sewa WHERE id=?").get(req.params.id);
  if (!o) return res.status(404).json({ error: "Data tidak ditemukan" });
  const d = Number(o.dibayar) + Number(req.body.nominal || 0);
  db.prepare("UPDATE sewa SET dibayar=?,status_bayar=? WHERE id=?").run(d, statusBayar(o.total, d), req.params.id);
  res.json({ success: true });
});
app.delete("/api/sewa/:id", (req, res) => { db.prepare("DELETE FROM sewa WHERE id=?").run(req.params.id); res.json({ success: true }); });

app.get("/api/pengeluaran", (req, res) => res.json(db.prepare("SELECT * FROM pengeluaran ORDER BY id DESC").all()));
app.post("/api/pengeluaran", (req, res) => { const b = req.body; const r = db.prepare("INSERT INTO pengeluaran(tanggal,kategori,keterangan,nominal) VALUES(?,?,?,?)").run(b.tanggal, b.kategori, b.keterangan, Number(b.nominal || 0)); res.json({ id: r.lastInsertRowid }); });
app.delete("/api/pengeluaran/:id", (req, res) => { db.prepare("DELETE FROM pengeluaran WHERE id=?").run(req.params.id); res.json({ success: true }); });

app.get("/api/rekap/piutang", (req, res) => {
  res.json(db.prepare(`SELECT s.kode,s.tgl_booking,c.nama customer,c.no_hp,a.nama armada,s.total,s.dibayar,(s.total-s.dibayar) sisa FROM sewa s JOIN customer c ON s.customer_id=c.id JOIN armada a ON s.armada_id=a.id WHERE s.total>s.dibayar`).all());
});

app.get("/api/export/sewa", (req, res) => {
  const rows = db.prepare("SELECT * FROM sewa ORDER BY id DESC").all();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sewa");
  const f = path.join(__dirname, "data", "laporan_sewa.xlsx");
  XLSX.writeFile(wb, f);
  res.download(f);
});

/* INVOICE A5 LANDSCAPE PROFESSIONAL */
app.get("/invoice/:id", (req, res) => {
  const d = detail(req.params.id);
  const s = setting();
  if (!d) return res.send("Invoice tidak ditemukan");

  const sisa = Number(d.total || 0) - Number(d.dibayar || 0);

  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Invoice ${d.kode}</title>
<style>
@page{size:A5 landscape;margin:7mm}
*{box-sizing:border-box}
body{font-family:Segoe UI,Arial,sans-serif;margin:0;background:#e5e7eb;color:#0f172a}
.print{margin:10px auto;display:block;background:#0f172a;color:white;border:0;border-radius:9px;padding:9px 18px;font-weight:800;cursor:pointer}
.invoice{width:800px;margin:14px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 14px 35px rgba(15,23,42,.2)}
.head{height:118px;display:grid;grid-template-columns:1.05fr .95fr;background:#0f172a;color:white;position:relative}
.head:after{content:"";position:absolute;left:382px;top:0;width:42px;height:118px;background:white;transform:skewX(-28deg)}
.brand{padding:22px 28px;display:flex;gap:16px;align-items:center}
.logo{width:58px;height:58px;border-radius:15px;background:linear-gradient(135deg,#22c55e,#0ea5e9);display:flex;align-items:center;justify-content:center;font-weight:950;font-size:28px}
.brand h1{margin:0;font-size:32px}.brand h1 span{color:#22c55e}.brand p{margin:5px 0 0;color:#e2e8f0;font-size:14px}
.inv{padding:20px 26px;text-align:right;background:linear-gradient(135deg,#0f3fb3,#2563eb)}
.inv h2{margin:0;font-size:34px;letter-spacing:1px}.inv h3{margin:10px 0 0;font-size:17px}.inv p{margin:8px 0 0;font-size:15px}
.content{padding:22px 26px 16px;display:grid;grid-template-columns:310px 1fr;gap:22px}
.left{display:flex;flex-direction:column;gap:11px}
.info{border:1px solid #dbe1ea;border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:42px 1fr;gap:12px;align-items:center;background:#fff}
.ico{width:36px;height:36px;border-radius:50%;background:#2563eb;color:white;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900}
.info small{display:block;color:#2563eb;font-weight:900;font-size:12px;text-transform:uppercase}
.info b{display:block;margin:5px 0 2px;font-size:16px}.info p{margin:0;font-size:13px;color:#334155}
.sign-wrap{margin-top:4px;display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:center;font-size:12px}
.sign{min-height:105px}.sign .scribble{font-family:Georgia,serif;font-style:italic;color:#2563eb;font-size:24px;font-weight:900;margin-top:30px}
.sign-line{margin-top:45px;border-top:2px solid #111827;padding-top:5px;font-weight:900}.admin-line{margin-top:10px}
.tablebox{border:1px solid #dbe1ea;border-radius:12px;overflow:hidden;background:white}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:linear-gradient(135deg,#0f3fb3,#2563eb);color:white;text-align:left;padding:11px}
td{padding:10px 11px;border-bottom:1px dashed #cbd5e1}.r{text-align:right}
.summary{width:315px;margin:14px 0 0 auto;border:1px solid #dbe1ea;border-radius:12px;padding:12px;background:#f8fafc}
.row{display:flex;justify-content:space-between;border-bottom:1px solid #dbe1ea;padding:8px 0;font-size:15px}
.sisa{margin-top:10px;background:#16a34a;color:white;border-radius:10px;padding:11px 13px;display:flex;justify-content:space-between;font-size:20px;font-weight:950}
.note{margin-top:14px;border:1px dashed #cbd5e1;border-radius:12px;padding:12px;display:grid;grid-template-columns:35px 1fr;gap:10px;font-size:12px;color:#334155}
.foot{background:#0f172a;color:white;text-align:center;padding:12px;font-size:12px}
@media print{body{background:white}.print{display:none}.invoice{margin:0;width:100%;box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<button class="print" onclick="window.print()">Cetak / Simpan PDF</button>
<div class="invoice">
  <div class="head">
    <div class="brand">
      <div class="logo">AR</div>
      <div><h1>Alte<span>RentCar</span></h1><p>Rental Mobil Semarang</p><p>${s.alamat || "Semarang, Jawa Tengah, Indonesia"}</p></div>
    </div>
    <div class="inv">
      <h2>INVOICE</h2>
      <h3>${d.kode}</h3>
      <p>${d.tgl_booking || ""}</p>
    </div>
  </div>

  <div class="content">
    <div class="left">
      <div class="info"><div class="ico">👤</div><div><small>Customer</small><b>${d.customer || "-"}</b><p>${d.hp || "-"}</p></div></div>
      <div class="info"><div class="ico">🚗</div><div><small>Mobil</small><b>${d.armada || "-"}</b><p>Plat: ${d.plat || "-"}</p></div></div>
      <div class="info"><div class="ico">📅</div><div><small>Periode Sewa</small><b>${d.tgl_mulai} s/d ${d.tgl_selesai}</b><p>Durasi: ${d.durasi || 1} hari</p></div></div>
      <div class="info"><div class="ico">📄</div><div><small>Status Pembayaran</small><b>${d.status_bayar || "Belum Bayar"}</b><p>Status Sewa: ${d.status_sewa || "-"}</p></div></div>

      <div class="sign-wrap">
        <div class="sign">Customer<div class="scribble">Ttd</div><div class="sign-line">${d.customer || "Customer"}</div></div>
        <div class="sign">Admin / AlteRentCar<div class="scribble">AlteRentCar</div><div class="sign-line admin-line">Admin Rental</div></div>
      </div>
    </div>

    <div class="rightside">
      <div class="tablebox">
        <table>
          <thead><tr><th>Rincian Biaya</th><th class="r">Nominal</th></tr></thead>
          <tbody>
            <tr><td>Sewa ${d.armada || "-"} (${d.durasi || 1} hari x ${rupiah(d.harga_harian)})</td><td class="r">${rupiah((d.durasi || 1) * (d.harga_harian || 0))}</td></tr>
            <tr><td>Biaya Sopir</td><td class="r">${rupiah(d.biaya_sopir)}</td></tr>
            <tr><td>Biaya BBM</td><td class="r">${rupiah(d.biaya_bbm)}</td></tr>
            <tr><td>Biaya Tol / Parkir</td><td class="r">${rupiah(d.biaya_tol)}</td></tr>
            <tr><td>Biaya Lain-lain</td><td class="r">${rupiah(d.biaya_lain)}</td></tr>
            <tr><td>Diskon</td><td class="r">- ${rupiah(d.diskon)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="summary">
        <div class="row"><span>Total</span><b>${rupiah(d.total)}</b></div>
        <div class="row"><span>Dibayar</span><b>${rupiah(d.dibayar)}</b></div>
        <div class="sisa"><span>Sisa</span><span>${rupiah(sisa)}</span></div>
      </div>

      <div class="note"><div class="ico">i</div><div><b>Catatan:</b><br>Invoice ini sah sebagai bukti transaksi rental mobil. Mohon lakukan pelunasan sesuai nominal sisa pembayaran.</div></div>
    </div>
  </div>
  <div class="foot">WhatsApp: ${s.wa_admin || "-"} &nbsp; | &nbsp; Terima kasih telah mempercayakan kebutuhan transportasi Anda kepada kami.</div>
</div>
</body>
</html>
`);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AlteRentCar jalan di http://localhost:${PORT}`);
  console.log(`Website pelanggan: http://localhost:${PORT}/customer/`);
  console.log("Login admin: admin / admin123");
});
