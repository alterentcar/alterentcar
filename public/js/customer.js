let A=[];

const rp=n=>"Rp "+Number(n||0).toLocaleString("id-ID");

function carImage(nama){
  nama=(nama||"").toLowerCase();

  let query="mobil rental indonesia";

  if(nama.includes("avanza")){
    query="Toyota Avanza New Matic white";
  }else if(nama.includes("brio")){
    query="Honda Brio New Matic white";
  }else if(nama.includes("innova") || nama.includes("reborn")){
    query="Toyota Innova Reborn New Matic black";
  }else if(nama.includes("calya")){
    query="Toyota Calya New Matic white";
  }

  return "https://tse1.mm.bing.net/th?q="+encodeURIComponent(query)+"&w=900&h=520&c=7&rs=1&p=0&o=5&pid=1.7";
}

function h(a,b){
  let d=Math.ceil((new Date(b)-new Date(a))/86400000);
  return d<=0?1:d;
}

function t(){
  return new Date().toISOString().slice(0,10);
}

async function load(){
  let s=await fetch("/api/public/setting").then(r=>r.json());
  document.querySelector("h1").innerText=s.nama_usaha || "AlteRentCar";

  A=await fetch("/api/public/armada").then(r=>r.json());

  list.innerHTML=A.map(a=>`
    <div class="car">
      <div class="car-image-wrap">
        <img 
          src="${carImage(a.nama)}" 
          class="car-img" 
          alt="${a.nama}"
          onerror="this.src='/cars/default.svg'"
        >
        <span class="car-status">${a.status || "Ready"}</span>
      </div>

      <div class="car-body">
        <h3>${a.nama}</h3>
        <p class="car-type">${a.tipe||""} ${a.tahun||""}</p>
        <p class="car-desc">${a.deskripsi||""}</p>
        <div class="price">${rp(a.harga)}/hari</div>
      </div>
    </div>
  `).join("");

  armada.innerHTML='<option value="">Pilih Mobil</option>'+
    A.map(a=>`<option value="${a.id}">${a.nama} - ${rp(a.harga)}/hari</option>`).join("");

  mulai.value=t();
  selesai.value=t();
  prev();
}

function prev(){
  let a=A.find(x=>x.id==armada.value);
  let tot=a?h(mulai.value,selesai.value)*Number(a.harga||0)+Number(biayaSopir.value||0):0;
  preview.innerText=rp(tot);
}

armada.onchange=mulai.onchange=selesai.onchange=biayaSopir.oninput=prev;

sopir.onchange=()=>{
  biayaSopir.value=sopir.value==="Ya"?150000:0;
  prev();
};

form.onsubmit=async e=>{
  e.preventDefault();

  let r=await fetch("/api/public/booking",{
    method:"POST",
    body:new FormData(form)
  });

  let d=await r.json();

  if(!r.ok){
    return alert(d.error||"Gagal");
  }

  hasil.innerHTML=`
    <div class="success-box">
      <h3>Booking berhasil!</h3>
      <p>Kode Booking: <b>${d.kode}</b></p>
      <p>Estimasi Total: <b>${rp(d.total)}</b></p>
      <a class="wa" href="${d.wa}" target="_blank">Konfirmasi WhatsApp</a>
    </div>
  `;

  form.reset();
  load();
};

load();