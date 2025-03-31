/* 
  ==============================
  = Variables y funciones      =
  ==============================
*/
const periodosPorAño = {
  diaria: 365,
  semanal: 52,
  quincenal: 24,
  mensual: 12,
  bimestral: 6,
  trimestral: 4,
  cuatrimestral: 3,
  semestral: 2,
  anual: 1
};

function cambiarTemporalidadEfectiva(tasa, periodosPorAño) {
  return ((1 + tasa) ** periodosPorAño - 1) * 100;
}

function convertirTasa(data) {
  const tasa = data["valor_tasa"] / 100;
  const periodo = data["periodo"];
  const m = periodosPorAño[periodo];

  if (m === undefined) throw new Error(`Periodo no válido: ${periodo}`);
  return cambiarTemporalidadEfectiva(tasa, m);
}

function calcularInteresesCompuestos(data, tea) {
  const montoInicial = parseFloat(data["monto"]);
  const plazoDias = parseFloat(data["plazo_unidad_de_tiempo"]);
  const tasaDecimal = tea / 100;

  if (isNaN(plazoDias) || isNaN(montoInicial)) {
    throw new Error("Monto o plazo no son válidos.");
  }

  const factorTiempo = plazoDias / 365;
  const capitalTotal = montoInicial * Math.pow(1 + tasaDecimal, factorTiempo);
  return capitalTotal - montoInicial;
}

let grafico = null;
function generarGrafico(monto, interes) {
  const ctx = document.getElementById('graficoTasa').getContext('2d');
  if (grafico instanceof Chart) grafico.destroy();

  grafico = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Monto Inicial', 'Interés Calculado'],
      datasets: [{
        label: 'Distribución del Total',
        data: [monto, interes],
        backgroundColor: ['#36A2EB', '#FF6384'],
        hoverOffset: 20
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

/* 
  ==============================
  = Manejo de la Interfaz      =
  ==============================
*/
let historialConversacion = "";

// Elementos del DOM
const enviarBtn = document.getElementById("enviarBtn");
const reiniciarBtn = document.getElementById("reiniciarBtn");
const mensajeEl = document.getElementById("mensaje");
const respuestaEl = document.getElementById("respuesta");
const respuestaTasaEl = document.getElementById("respuestaTasa");
const respuestaInteresEl = document.getElementById("respuestaInteres");
const spinnerEl = document.getElementById("spinner");

/* Evento para Enviar */
enviarBtn.addEventListener("click", async () => {
  const nuevaEntrada = mensajeEl.value;
  if (!nuevaEntrada.trim()) return;

  // Mostrar el spinner
  spinnerEl.style.display = "inline-block";

  // Construimos el historial
  historialConversacion += (historialConversacion ? " " : "") + nuevaEntrada;

  try {
    const res = await fetch("http://localhost:3000/chatGPT", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto_usuario: historialConversacion })
    });

    const data = await res.json();

    if (data.faltantes) {
      respuestaEl.textContent = data.pregunta;
    } else {
      respuestaEl.textContent = JSON.stringify(data, null, 2);

      try {
        const tea = convertirTasa(data);
        respuestaTasaEl.textContent = `${tea.toFixed(2)}%`;
        const interes = calcularInteresesCompuestos(data, tea);
        respuestaInteresEl.textContent = `${interes.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
        generarGrafico(data.monto, interes);

        // Si deseas reiniciar la conversación en cada petición exitosa:
        // historialConversacion = "";
      } catch (error) {
        respuestaTasaEl.textContent = `Error en conversión: ${error.message}`;
        respuestaInteresEl.textContent = "";
      }
    }

    // Limpiamos el textarea
    mensajeEl.value = "";
  } catch (error) {
    console.error("Error:", error);
    respuestaEl.textContent = "Error al procesar la solicitud.";
  } finally {
    // Ocultar el spinner
    spinnerEl.style.display = "none";
  }
});

/* Evento para Reiniciar */
reiniciarBtn.addEventListener("click", () => {
  historialConversacion = "";
  mensajeEl.value = "";
  respuestaEl.textContent = "Esperando entrada...";
  respuestaTasaEl.textContent = "";
  respuestaInteresEl.textContent = "";
  if (grafico instanceof Chart) grafico.destroy();
});