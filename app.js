const CLAVE = "control-entradas-registros";
let registros = JSON.parse(localStorage.getItem(CLAVE) || "[]");

const $ = id => document.getElementById(id);

function fechaActual() {
  const ahora = new Date();
  return ahora.toLocaleDateString("es-AR");
}

function horaActual() {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function guardarDatos() {
  localStorage.setItem(CLAVE, JSON.stringify(registros));
}

function mostrarMensaje(texto, error = false) {
  $("mensaje").textContent = texto;
  $("mensaje").style.color = error ? "#b91c1c" : "#166534";
  setTimeout(() => $("mensaje").textContent = "", 3500);
}

function agregarRegistro() {
  const nombre = $("nombre").value.trim();
  const departamento = $("departamento").value.trim();
  const tipo = $("tipo").value;
  const evento = $("evento").value;

  if (!nombre || !departamento) {
    mostrarMensaje("Completá nombre y departamento.", true);
    return;
  }

  registros.push({
    id: Date.now(),
    fecha: fechaActual(),
    hora: horaActual(),
    nombre,
    departamento,
    tipo,
    evento
  });

  guardarDatos();
  $("nombre").value = "";
  $("departamento").value = "";
  mostrarMensaje("Movimiento guardado.");
  actualizarPantalla();
}

function actualizarPantalla() {
  const hoy = fechaActual();
  const delDia = registros.filter(r => r.fecha === hoy);

  $("historial").innerHTML = delDia.length
    ? delDia.map(r => `
      <tr>
        <td>${r.hora}</td>
        <td>${escapar(r.nombre)}</td>
        <td>${escapar(r.departamento)}</td>
        <td>${r.tipo}</td>
        <td>${r.evento}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="5" class="vacio">No hay movimientos registrados hoy.</td></tr>`;

  const afuera = [];

  for (const registro of delDia) {
    const clave = `${registro.nombre.toLowerCase()}|${registro.departamento.toLowerCase()}`;
    const anterior = afuera.findIndex(x => x.clave === clave);

    if (registro.evento === "salió" && anterior === -1) {
      afuera.push({
        clave,
        nombre: registro.nombre,
        departamento: registro.departamento,
        tipo: registro.tipo
      });
    }

    if (registro.evento === "volvió" && anterior !== -1) {
      afuera.splice(anterior, 1);
    }
  }

  $("contador").textContent = afuera.length;
  $("afuera").innerHTML = afuera.length
    ? afuera.map(x => `<li>${escapar(x.nombre)} — Depto. ${escapar(x.departamento)} (${x.tipo})</li>`).join("")
    : `<li class="vacio">No hay personas afuera.</li>`;
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[caracter]));
}

function generarPDF() {
  const hoy = fechaActual();
  const delDia = registros.filter(r => r.fecha === hoy);

  if (!delDia.length) {
    mostrarMensaje("No hay registros para generar el PDF.", true);
    return;
  }

  if (!window.jspdf) {
    mostrarMensaje("El generador PDF todavía no está disponible.", true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pdf.setFontSize(16);
  pdf.text("Control de Entradas", 14, 18);
  pdf.setFontSize(11);
  pdf.text(`Fecha: ${hoy}`, 14, 27);

  let y = 40;
  pdf.setFontSize(9);
  pdf.text("Hora", 14, y);
  pdf.text("Nombre", 35, y);
  pdf.text("Depto.", 95, y);
  pdf.text("Tipo", 125, y);
  pdf.text("Evento", 155, y);
  y += 7;

  for (const r of delDia) {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }

    pdf.text(r.hora, 14, y);
    pdf.text(r.nombre.substring(0, 28), 35, y);
    pdf.text(r.departamento.substring(0, 12), 95, y);
    pdf.text(r.tipo, 125, y);
    pdf.text(r.evento, 155, y);
    y += 6;
  }

  pdf.save(`control-entradas-${hoy.replaceAll("/", "-")}.pdf`);
}

function cierreAutomatico() {
  const ahora = new Date();
  const dia = ahora.getDay();
  const hora = ahora.getHours();

  if (dia >= 1 && dia <= 5 && hora >= 17) {
    const clave = `pdf-generado-${fechaActual()}`;

    if (!localStorage.getItem(clave) &&
        registros.some(r => r.fecha === fechaActual())) {
      generarPDF();
      localStorage.setItem(clave, "sí");
    }
  }
}

$("guardar").addEventListener("click", agregarRegistro);
$("pdf").addEventListener("click", generarPDF);

$("limpiar").addEventListener("click", () => {
  if (confirm("¿Borrar todos los registros guardados en este teléfono?")) {
    registros = [];
    guardarDatos();
    actualizarPantalla();
  }
});

$("voz").addEventListener("click", () => {
  const Reconocimiento = window.SpeechRecognition ||
                         window.webkitSpeechRecognition;

  if (!Reconocimiento) {
    mostrarMensaje("Tu navegador no admite reconocimiento de voz.", true);
    return;
  }

  const reconocimiento = new Reconocimiento();
  reconocimiento.lang = "es-AR";
  reconocimiento.continuous = false;
  reconocimiento.interimResults = false;

  mostrarMensaje("Escuchando… hablá ahora.");
  reconocimiento.start();

  reconocimiento.onresult = evento => {
    const texto = evento.results[0][0].transcript;
    interpretarVoz(texto);
  };

  reconocimiento.onerror = () => {
    mostrarMensaje("No pude entender el audio. Probá nuevamente.", true);
  };
});

function interpretarVoz(texto) {
  const minusculas = texto.toLowerCase();

  const evento = minusculas.includes("volvió") ||
                minusculas.includes("volvio") ||
                minusculas.includes("regresó") ||
                minusculas.includes("regreso")
    ? "volvió"
    : "salió";

  const tipo = minusculas.includes("visita") ||
               minusculas.includes("visitante")
    ? "visita"
    : "residente";

  const departamentoEncontrado =
    texto.match(/(?:departamento|depto\.?|dpto\.?)\s*([a-z0-9-]+)/i);

  if (!departamentoEncontrado) {
    mostrarMensaje(`Escuché: "${texto}". Escribí el departamento y confirmá.`, true);
    $("evento").value = evento;
    $("tipo").value = tipo;
    $("nombre").focus();
    return;
  }

  const departamento = departamentoEncontrado[1];
  let nombre = texto
    .replace(/(?:departamento|depto\.?|dpto\.?)\s*[a-z0-9-]+/i, "")
    .replace(/visita|visitante|residente|salió|salio|volvió|volvio|regresó|regreso/ig, "")
    .replace(/[,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!nombre) {
    mostrarMensaje("No pude identificar el nombre. Completalo manualmente.", true);
    return;
  }

  $("nombre").value = nombre;
  $("departamento").value = departamento;
  $("tipo").value = tipo;
  $("evento").value = evento;

  mostrarMensaje("Revisá los datos y tocá “Guardar movimiento”.");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

actualizarPantalla();
cierreAutomatico();