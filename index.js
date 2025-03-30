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
        hoverOffset: 4
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

let historialConversacion = "";
document.getElementById("enviarBtn").addEventListener("click", async () => {
  const nuevaEntrada = document.getElementById("mensaje").value;
  if (!nuevaEntrada.trim()) return;

  historialConversacion += (historialConversacion ? " " : "") + nuevaEntrada;

  try {
    const res = await fetch("http://localhost:3000/chatGPT", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto_usuario: historialConversacion })
    });

    const data = await res.json();

    if (data.faltantes) {
      document.getElementById("respuesta").textContent = data.pregunta;
    } else {
      document.getElementById("respuesta").textContent = JSON.stringify(data, null, 2);
      try {
        const tea = convertirTasa(data);
        document.getElementById("respuestaTasa").textContent = `TEA: ${tea.toFixed(2)}%`;
        const interes = calcularInteresesCompuestos(data, tea);
        document.getElementById("respuestaInteres").textContent = `Interés Total: ${interes.toFixed(2)}`;
        generarGrafico(data.monto, interes);
        historialConversacion = "";
      } catch (error) {
        document.getElementById("respuestaTasa").textContent = `Error en conversión: ${error.message}`;
        document.getElementById("respuestaInteres").textContent = "";
      }
    }

    document.getElementById("mensaje").value = "";
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("respuesta").textContent = "Error al procesar la solicitud.";
  }
});
