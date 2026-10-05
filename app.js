const CLAVE="control-entradas-registros";
const CLAVE_PAQUETES="control-entradas-paquetes";
let registros=JSON.parse(localStorage.getItem(CLAVE)||"[]");
let paquetes=JSON.parse(localStorage.getItem(CLAVE_PAQUETES)||"[]");
const $=id=>document.getElementById(id);
const fechaActual=()=>new Date().toLocaleDateString("es-AR");
const horaActual=()=>new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
const escapar=t=>String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function mensaje(id,texto,error=false){$(id).textContent=texto;$(id).style.color=error?"#b91c1c":"#166534";setTimeout(()=>$(id).textContent="",3500)}

function actualizar(){
 const hoy=fechaActual(), dia=registros.filter(r=>r.fecha===hoy);
 $("historial").innerHTML=dia.length?dia.map(r=>`<tr><td>${r.hora}</td><td>${escapar(r.nombre)}</td><td>${escapar(r.departamento)}</td><td>${r.tipo}</td><td>${r.evento}</td></tr>`).join(""):`<tr><td colspan="5" class="vacio">No hay movimientos.</td></tr>`;
 let afuera=[];
 dia.forEach(r=>{let k=(r.nombre+"|"+r.departamento).toLowerCase(),i=afuera.findIndex(x=>x.k===k);if(r.evento==="salió"&&i<0)afuera.push({k,nombre:r.nombre,departamento:r.departamento,tipo:r.tipo});if(r.evento==="volvió"&&i>=0)afuera.splice(i,1)});
 $("contador").textContent=afuera.length;
 $("afuera").innerHTML=afuera.length?afuera.map(x=>`<li>${escapar(x.nombre)} — ${escapar(x.departamento)} (${x.tipo})</li>`).join(""):`<li class="vacio">No hay personas afuera.</li>`;
 const ps=paquetes.filter(p=>p.fecha===hoy);
 $("listaPaquetes").innerHTML=ps.length?ps.map(p=>`<tr><td>${p.hora}</td><td>${escapar(p.empresa)}</td><td>${escapar(p.destinatario)}</td><td>${escapar(p.piso)}</td><td>${escapar(p.seguimiento||"-")}</td></tr>`).join(""):`<tr><td colspan="5" class="vacio">No hay paquetes recibidos.</td></tr>`;
}

$("guardar").onclick=()=>{
 let nombre=$("nombre").value.trim(),departamento=$("departamento").value.trim();
 if(!nombre||!departamento)return mensaje("mensaje","Completá nombre y departamento.",true);
 registros.push({fecha:fechaActual(),hora:horaActual(),nombre,departamento,tipo:$("tipo").value,evento:$("evento").value});
 localStorage.setItem(CLAVE,JSON.stringify(registros));$("nombre").value="";$("departamento").value="";mensaje("mensaje","Movimiento guardado.");actualizar();
};

$("guardarPaquete").onclick=()=>{
 let destinatario=$("destinatario").value.trim(),piso=$("pisoPaquete").value.trim();
 if(!destinatario||!piso)return mensaje("mensajePaquete","Completá destinatario y piso/departamento.",true);
 paquetes.push({fecha:fechaActual(),hora:horaActual(),empresa:$("empresa").value,destinatario,piso,seguimiento:$("seguimiento").value.trim()});
 localStorage.setItem(CLAVE_PAQUETES,JSON.stringify(paquetes));
 $("destinatario").value="";$("pisoPaquete").value="";$("seguimiento").value="";
 mensaje("mensajePaquete","Paquete guardado.");actualizar();
};

$("limpiar").onclick=()=>{if(confirm("¿Borrar todos los registros?")){registros=[];paquetes=[];localStorage.removeItem(CLAVE);localStorage.removeItem(CLAVE_PAQUETES);actualizar()}};

$("pdf").onclick=()=>{
 const {jsPDF}=window.jspdf, pdf=new jsPDF(),hoy=fechaActual();
 pdf.setFontSize(16);pdf.text("Control de Entradas",14,18);pdf.setFontSize(10);pdf.text("Fecha: "+hoy,14,27);
 let y=40;pdf.text("Movimientos",14,y);y+=8;
 registros.filter(r=>r.fecha===hoy).forEach(r=>{pdf.text(`${r.hora} - ${r.nombre} - ${r.departamento} - ${r.evento}`,14,y);y+=6});
 y+=8;pdf.text("Paquetes recibidos",14,y);y+=8;
 paquetes.filter(p=>p.fecha===hoy).forEach(p=>{if(y>280){pdf.addPage();y=20}pdf.text(`${p.hora} - ${p.empresa} - ${p.destinatario} - Piso ${p.piso}`,14,y);y+=6});
 pdf.save("control-"+hoy.replaceAll("/","-")+".pdf");
};

if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js");
actualizar();
$("voz").onclick = () => {
  const Reconocimiento =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Reconocimiento) {
    mensaje("mensaje", "Usá Google Chrome para registrar por voz.", true);
    return;
  }

  const reconocimiento = new Reconocimiento();
  reconocimiento.lang = "es-AR";
  reconocimiento.continuous = false;
  reconocimiento.interimResults = false;

  mensaje("mensaje", "Escuchando… hablá ahora.");

  reconocimiento.onresult = evento => {
    const texto = evento.results[0][0].transcript;
    interpretarVoz(texto);
  };

  reconocimiento.onerror = () => {
    mensaje("mensaje", "No pude reconocer la voz. Revisá el permiso del micrófono.", true);
  };

  reconocimiento.start();
};

function interpretarVoz(texto) {
  const t = texto.toLowerCase();

  $("nombre").value = texto
    .replace(/departamento|depto|piso|salió|salio|volvió|volvio|visita|residente/gi, "")
    .trim();

  const piso = texto.match(/(?:departamento|depto|piso)\s*([a-z0-9-]+)/i);
  if (piso) $("departamento").value = piso[1];

  $("tipo").value = t.includes("visita") ? "visita" : "residente";
  $("evento").value =
    t.includes("volvió") || t.includes("volvio") ? "volvió" : "salió";

  mensaje("mensaje", "Revisá los datos y tocá Guardar movimiento.");
}
$("voz").addEventListener("click", function () {
  const Reconocimiento =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Reconocimiento) {
    mensaje("mensaje", "Usá Google Chrome para usar el micrófono.", true);
    return;
  }

  const reconocimiento = new Reconocimiento();
  reconocimiento.lang = "es-AR";
  reconocimiento.continuous = false;
  reconocimiento.interimResults = false;

  mensaje("mensaje", "Escuchando... hablá ahora.");