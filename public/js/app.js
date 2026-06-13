let A=[],C=[],S=[],SW=[],P=[],PI=[];
const $=id=>document.getElementById(id);
const rp=n=>"Rp "+Number(n||0).toLocaleString("id-ID");
const api=async(u,o={})=>{let r=await fetch(u,o),d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||"Terjadi error");throw Error(d.error||"error")}return d};
const bl=()=>bulan.value;
const today=()=>new Date().toISOString().slice(0,10);
function login(){api("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:user.value,password:pass.value})}).then(()=>{localStorage.login="1";loginPage.classList.add("hidden");app.classList.remove("hidden");loadAll()})}
function logout(){localStorage.removeItem("login");location.reload()}
if(localStorage.login){setTimeout(()=>{loginPage.classList.add("hidden");app.classList.remove("hidden");loadAll()},100)}
function page(id,b){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  $(id).classList.remove("hidden");
  document.querySelectorAll("aside button").forEach(x=>x.classList.remove("active"));
  if(b)b.classList.add("active");
  title.innerText=b?b.innerText:"Dashboard";
  if(id==="rekapPage") loadRekap();
}
function badgeStatus(s){let x=(s||"").toLowerCase();if(x.includes("booking"))return`<span class="badge booking">${s}</span>`;if(x.includes("berjalan"))return`<span class="badge berjalan">${s}</span>`;if(x.includes("selesai"))return`<span class="badge selesai">${s}</span>`;if(x.includes("batal"))return`<span class="badge batal">${s}</span>`;return`<span class="badge">${s||"-"}</span>`}
function badgeBayar(s){let x=(s||"").toLowerCase();if(x.includes("lunas"))return`<span class="badge lunas">${s}</span>`;if(x.includes("dp"))return`<span class="badge dp">${s}</span>`;return`<span class="badge belum">${s||"Belum Bayar"}</span>`}
function hari(a,b){let d=Math.ceil((new Date(b)-new Date(a))/86400000);return d<=0?1:d}
async function loadDash(){let d=await api(bl()?"/api/dashboard?bulan="+bl():"/api/dashboard");jumlah.innerText=d.jumlah||d.jumlah_sewa||0;omzet.innerText=rp(d.omzet);masuk.innerText=rp(d.masuk);piutang.innerText=rp(d.piutang);keluar.innerText=rp(d.pengeluaran);bookingweb.innerText=d.booking_web||d.bookingWebsite||0}
async function loadSet(){let s=await api("/api/setting").catch(()=>({}));setNama.value=s.nama_usaha||"";setWa.value=s.wa_admin||s.whatsapp_admin||"";setAlamat.value=s.alamat||""}
async function saveSetting(){await api("/api/setting",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({nama_usaha:setNama.value,wa_admin:setWa.value,whatsapp_admin:setWa.value,alamat:setAlamat.value})});alert("Setting tersimpan")}
async function loadArmada(){A=await api("/api/armada");armadaCards.innerHTML=A.map(a=>`<div class="unit-card"><div class="unit-top">${(a.nama||"MOBIL").split(" ")[0]}</div><h3>${a.nama||"-"}</h3><p>${a.plat||"-"} • ${a.tipe||"-"} ${a.tahun||""}</p><h2>${rp(a.harga||a.harga_harian)}/hari</h2>${badgeStatus(a.status||"Ready")}<div class="action-row"><button onclick="editArmada(${a.id})">Edit</button><button class="btn-red" onclick="del('/api/armada/${a.id}')">Hapus</button></div></div>`).join("");sewaArmada.innerHTML='<option value="">Pilih Armada</option>'+A.map(a=>`<option value="${a.id}">${a.nama} - ${a.plat||""} - ${rp(a.harga||a.harga_harian)}/hari</option>`).join("")}
async function addArmada(){if(!aNama.value)return alert("Nama armada wajib diisi");await api("/api/armada",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nama:aNama.value,plat:aPlat.value,tipe:aTipe.value,tahun:aTahun.value,harga:aHarga.value,harga_harian:aHarga.value,status:aStatus.value,deskripsi:aDesk.value})});aNama.value=aPlat.value=aTipe.value=aTahun.value=aHarga.value=aDesk.value="";loadAll()}
async function editArmada(id){let a=A.find(x=>x.id==id),harga=prompt("Harga harian",a.harga||a.harga_harian);if(harga===null)return;let status=prompt("Status: Ready / Disewa / Service",a.status||"Ready");if(!status)return;await api("/api/armada/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...a,harga,harga_harian:harga,status})});loadAll()}
async function loadCustomer(){C=await api("/api/customer");customerCards.innerHTML=C.map(c=>`<div class="person-card"><h3>${c.nama||"-"}</h3><p>${c.no_hp||"-"}</p><p>${c.alamat||"-"}</p><p><b>KTP/SIM:</b> ${c.no_identitas||"-"}</p>${c.foto_ktp?`<a href="${c.foto_ktp}" target="_blank" class="btn">Lihat KTP</a>`:""} <button class="btn-red" onclick="del('/api/customer/${c.id}')">Hapus</button></div>`).join("");sewaCustomer.innerHTML='<option value="">Pilih Customer</option>'+C.map(c=>`<option value="${c.id}">${c.nama} - ${c.no_hp||""}</option>`).join("")}
async function addCustomer(){await fetch("/api/customer",{method:"POST",body:new FormData(formCust)});formCust.reset();loadAll()}
async function loadSopir(){S=await api("/api/sopir");sopirCards.innerHTML=S.map(s=>`<div class="person-card"><h3>${s.nama||"-"}</h3><p>${s.no_hp||"-"}</p>${badgeStatus(s.status||"Aktif")}<div class="action-row"><button class="btn-red" onclick="del('/api/sopir/${s.id}')">Hapus</button></div></div>`).join("")}
async function addSopir(){if(!sNama.value)return alert("Nama sopir wajib diisi");await api("/api/sopir",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nama:sNama.value,no_hp:sHp.value,status:sStatus.value})});sNama.value=sHp.value="";loadAll()}
function isiHargaArmada(){let a=A.find(x=>x.id==sewaArmada.value);if(a)hargaHarian.value=a.harga||a.harga_harian;previewTotal()}
function previewTotal(){let total=(hari(tglMulai.value,tglSelesai.value)*Number(hargaHarian.value||0))+Number(biayaSopir.value||0)+Number(biayaBbm.value||0)+Number(biayaTol.value||0)+Number(biayaLain.value||0)-Number(diskon.value||0);totalPreview.innerText=rp(total)}
async function simpanSewa(){if(!sewaCustomer.value||!sewaArmada.value)return alert("Customer dan armada wajib dipilih");await api("/api/sewa",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer_id:sewaCustomer.value,armada_id:sewaArmada.value,tgl_mulai:tglMulai.value,tgl_selesai:tglSelesai.value,tanggal_mulai:tglMulai.value,tanggal_selesai:tglSelesai.value,harga_harian:hargaHarian.value,biaya_sopir:biayaSopir.value,biaya_bbm:biayaBbm.value,biaya_tol:biayaTol.value,biaya_tol_parkir:biayaTol.value,biaya_lain:biayaLain.value,diskon:diskon.value,dibayar:dibayar.value,dp:dibayar.value,status_sewa:statusSewa.value,catatan:catatanSewa.value})});alert("Sewa berhasil disimpan");loadAll()}
async function loadSewa(){SW=await api(bl()?"/api/sewa?bulan="+bl():"/api/sewa");renderSewa();recentRentals.innerHTML=SW.slice(0,5).map(s=>`<div class="mini-item"><div><b>${s.kode}</b><br><small>${s.customer||s.customer_nama||"-"} • ${s.armada||s.armada_nama||"-"}</small></div><div>${badgeStatus(s.status_sewa)}</div></div>`).join("")||"<p>Belum ada data.</p>"}
function renderSewa(){let q=(searchSewa?.value||"").toLowerCase(),st=(filterStatus?.value||"").toLowerCase();let data=SW.filter(s=>{let text=`${s.kode} ${s.customer||s.customer_nama} ${s.armada||s.armada_nama} ${s.hp||s.customer_hp}`.toLowerCase();return(!q||text.includes(q))&&(!st||String(s.status_sewa||"").toLowerCase()===st)});rentalCards.innerHTML=data.map(s=>rentalCard(s)).join("")||"<p>Data tidak ditemukan.</p>"}
function rentalCard(s){let total=Number(s.total||0),paid=Number(s.dibayar??s.dp??0),sisa=total-paid;return`<div class="rental-card"><div class="rental-head"><div><div class="rental-code">${s.kode}</div><div class="rental-date">${s.tgl_booking||s.tanggal_booking||"-"} • ${s.sumber||"Admin"}</div></div><div>${badgeStatus(s.status_sewa)}</div></div><div class="rental-info"><div class="info-box"><small>Customer</small><b>${s.customer||s.customer_nama||"-"}</b><p>${s.hp||s.customer_hp||""}</p></div><div class="info-box"><small>Mobil</small><b>${s.armada||s.armada_nama||"-"}</b><p>${s.plat||""}</p></div><div class="info-box"><small>Periode</small><b>${s.tgl_mulai||s.tanggal_mulai||"-"} s/d ${s.tgl_selesai||s.tanggal_selesai||"-"}</b><p>${s.durasi||1} hari</p></div><div class="info-box"><small>Status Bayar</small>${badgeBayar(s.status_bayar)}</div></div><div class="money-grid"><div class="money-box"><small>Total</small><b>${rp(total)}</b></div><div class="money-box"><small>Dibayar</small><b>${rp(paid)}</b></div><div class="money-box"><small>Sisa</small><b>${rp(sisa)}</b></div></div><div class="action-row"><button onclick="editSewa(${s.id})">Edit</button><button class="btn-orange" onclick="bayar(${s.id})">Bayar</button><button class="btn-green" onclick="statusRental(${s.id},'Berjalan')">Berjalan</button><button onclick="statusRental(${s.id},'Selesai')">Selesai</button><a class="btn" href="/invoice/${s.id}" target="_blank">Invoice</a><button class="btn-red" onclick="del('/api/sewa/${s.id}')">Hapus</button></div></div>`}
async function editSewa(id){let s=await api("/api/sewa/"+id),dib=prompt("Total sudah dibayar",s.dibayar??s.dp??0);if(dib===null)return;let status=prompt("Status sewa: Booking / Berjalan / Selesai / Batal",s.status_sewa);if(!status)return;await api("/api/sewa/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...s,dibayar:dib,dp:dib,status_sewa:status})});loadAll()}
async function bayar(id){let n=prompt("Nominal pembayaran:");if(!n)return;await api("/api/sewa/"+id+"/bayar",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({nominal:n})});loadAll()}
async function statusRental(id,status_sewa){let s=await api("/api/sewa/"+id);await api("/api/sewa/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...s,status_sewa})});loadAll()}
async function loadPeng(){P=await api("/api/pengeluaran");pengeluaranList.innerHTML=P.map(p=>`<div class="mini-item"><div><b>${p.kategori||"-"}</b><br><small>${p.tanggal||"-"} • ${p.keterangan||""}</small></div><div><b>${rp(p.nominal)}</b><br><button class="btn-red" onclick="del('/api/pengeluaran/${p.id}')">Hapus</button></div></div>`).join("")||"<p>Belum ada pengeluaran.</p>"}
async function addPengeluaran(){if(!pTgl.value||!pKat.value||!pNom.value)return alert("Tanggal, kategori, nominal wajib diisi");await api("/api/pengeluaran",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tanggal:pTgl.value,kategori:pKat.value,keterangan:pKet.value,nominal:pNom.value})});pKat.value=pKet.value=pNom.value="";loadAll()}
async function loadPiutang(){
  PI = await api("/api/rekap/piutang");

  const grouped = {};
  PI.forEach(x=>{
    const nama = x.customer || x.customer_nama || "-";
    const hp = x.no_hp || x.hp || x.customer_hp || "";
    if(!grouped[nama]){
      grouped[nama] = {customer:nama, hp, total:0, dibayar:0, sisa:0, transaksi:[]};
    }
    grouped[nama].total += Number(x.total || 0);
    grouped[nama].dibayar += Number(x.dibayar || 0);
    grouped[nama].sisa += Number(x.sisa || 0);
    grouped[nama].transaksi.push(x);
  });

  const list = Object.values(grouped).sort((a,b)=>b.sisa-a.sisa);

  miniPiutang.innerHTML = list.slice(0,5).map(x=>`
    <div class="mini-item">
      <div>
        <b>${x.customer}</b><br>
        <small>${x.hp || "-"} • ${x.transaksi.length} transaksi</small>
      </div>
      <b>${rp(x.sisa)}</b>
    </div>
  `).join("") || "<p>Tidak ada piutang aktif.</p>";

  piutangList.innerHTML = list.map(x=>`
    <div class="rental-card">
      <div class="rental-head">
        <div>
          <div class="rental-code">${x.customer}</div>
          <div class="rental-date">${x.hp || "-"} • ${x.transaksi.length} transaksi belum lunas</div>
        </div>
        ${badgeBayar("Belum Bayar")}
      </div>

      <div class="money-grid">
        <div class="money-box"><small>Total Tagihan</small><b>${rp(x.total)}</b></div>
        <div class="money-box"><small>Sudah Dibayar</small><b>${rp(x.dibayar)}</b></div>
        <div class="money-box"><small>Sisa Piutang</small><b>${rp(x.sisa)}</b></div>
      </div>

      <div class="mini-list">
        ${x.transaksi.map(t=>`
          <div class="mini-item">
            <div>
              <b>${t.kode}</b><br>
              <small>${t.tgl_booking || t.tanggal_booking || "-"} • ${t.armada || "-"}</small>
            </div>
            <b>${rp(t.sisa)}</b>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("") || "<p>Tidak ada piutang aktif.</p>";
}

function loadRekap(){
  const sewa = Array.isArray(SW) ? SW : [];
  const peng = Array.isArray(P) ? P : [];

  let totalTransaksi = sewa.length;
  let omzet = 0;
  let masuk = 0;
  let piutangTotal = 0;

  sewa.forEach(x=>{
    const total = Number(x.total || 0);
    const bayar = Number(x.dibayar ?? x.dp ?? 0);
    omzet += total;
    masuk += bayar;
    piutangTotal += Math.max(total - bayar, 0);
  });

  const keluar = peng.reduce((a,b)=>a+Number(b.nominal||0),0);
  const laba = masuk - keluar;

  if($("rekapJumlah")) rekapJumlah.innerText = totalTransaksi;
  if($("rekapOmzet")) rekapOmzet.innerText = rp(omzet);
  if($("rekapMasuk")) rekapMasuk.innerText = rp(masuk);
  if($("rekapPiutang")) rekapPiutang.innerText = rp(piutangTotal);
  if($("rekapKeluar")) rekapKeluar.innerText = rp(keluar);
  if($("rekapLaba")) rekapLaba.innerText = rp(laba);

  const customerMap = {};
  sewa.forEach(x=>{
    const nama = x.customer || x.customer_nama || "-";
    const hp = x.hp || x.customer_hp || x.no_hp || "";
    if(!customerMap[nama]){
      customerMap[nama] = {nama, hp, transaksi:0, total:0, dibayar:0, sisa:0};
    }
    const total = Number(x.total||0);
    const bayar = Number(x.dibayar ?? x.dp ?? 0);
    customerMap[nama].transaksi += 1;
    customerMap[nama].total += total;
    customerMap[nama].dibayar += bayar;
    customerMap[nama].sisa += Math.max(total-bayar,0);
  });

  if($("rekapCustomer")){
    rekapCustomer.innerHTML = Object.values(customerMap)
      .sort((a,b)=>b.total-a.total)
      .map(x=>`
        <div class="rental-card">
          <div class="rental-head">
            <div>
              <div class="rental-code">${x.nama}</div>
              <div class="rental-date">${x.hp || "-"} • ${x.transaksi} transaksi</div>
            </div>
          </div>
          <div class="money-grid">
            <div class="money-box"><small>Total Rental</small><b>${rp(x.total)}</b></div>
            <div class="money-box"><small>Dibayar</small><b>${rp(x.dibayar)}</b></div>
            <div class="money-box"><small>Sisa</small><b>${rp(x.sisa)}</b></div>
          </div>
        </div>
      `).join("") || "<p>Belum ada data rekapan.</p>";
  }

  const statusMap = {};
  sewa.forEach(x=>{
    const st = x.status_sewa || "-";
    statusMap[st] = (statusMap[st] || 0) + 1;
  });

  if($("rekapStatus")){
    rekapStatus.innerHTML = Object.entries(statusMap).map(([st,jml])=>`
      <div class="mini-item">
        <div>${badgeStatus(st)}</div>
        <b>${jml} transaksi</b>
      </div>
    `).join("") || "<p>Belum ada data status.</p>";
  }
}

async function del(u){if(confirm("Hapus data ini?")){await api(u,{method:"DELETE"});loadAll()}}
async function loadAll(){await loadDash();await loadSet();await loadArmada();await loadCustomer();await loadSopir();await loadSewa();await loadPeng();await loadPiutang();loadRekap();previewTotal()}
tglMulai.value=today();tglSelesai.value=today();pTgl.value=today();
