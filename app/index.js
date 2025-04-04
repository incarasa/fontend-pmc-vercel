/* 
  ==============================
  = Variables y funciones      =
  ==============================
*/

/**
 * Objeto que define cuántos periodos hay en un año, según la temporalidad.
 * Por ejemplo, "mensual" implica 12 periodos en un año.
 * Esto se usará tanto para "periodo" como para "capitalizacion" cuando sea nominal.
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

/**
 * Convierte una tasa efectiva de un periodo dado a tasa efectiva anual (TEA).
 * 
 * @param {number} tasa - Tasa efectiva de ese periodo (en decimal; ej: 0.02 para 2%).
 * @param {number} periodos - Cantidad de periodos en un año.
 * @returns {number} Tasa efectiva anual (en porcentaje; ej: 2.02 => 202%).
 */
function cambiarTemporalidadEfectiva(tasa, periodos) {
  return ((1 + tasa) ** periodos - 1) * 100;
}

/**
 * Convierte una tasa ingresada (puede ser nominal o efectiva) a Tasa Efectiva Anual (TEA).
 * 
 * - Si la tasa es "efectiva", se asume que "valor_tasa" corresponde directamente
 *   a la tasa efectiva del periodo indicado en "periodo", y se anualiza.
 * - Si la tasa es "nominal":
 *   1) Se convierte esa tasa nominal a nominal anual, multiplicando por la equivalencia
 *      de periodos según "periodo". Por ejemplo, si es nominal semestral 2%,
 *      la nominal anual es 2% * 2 = 4%.
 *   2) Una vez se tiene la Tasa Nominal Anual, se reparte entre la capitalización
 *      que se desee (por ejemplo, mes vencido => dividir entre 12). 
 *   3) Esa tasa es la "tasa por subperiodo" (nominal anual / 12, si la capitalización es mensual).
 *   4) Finalmente, se convierte esa tasa de subperiodo a efectiva anual con la
 *      fórmula (1 + subPeriodRate)^(nSubperiodosEnAño) - 1.
 * 
 * Ejemplo: Tasa nominal semestral mes vencido de 2%.
 * - Paso 1: nominal anual = 2% * 2 = 4%.
 * - Paso 2: capitalización mensual => 4% / 12 = 0.3333...% mensual.
 * - Paso 3: Efectiva Anual = (1 + 0.003333...)^12 - 1 => ~4.07%.
 * 
 * @param {Object} data 
 * @param {number} data.valor_tasa - Valor numérico de la tasa, ej: 2 => 2%.
 * @param {string} data.periodo - Periodo base de la tasa (ej: "mensual", "semestral").
 * @param {string} data.tipo_tasa - "nominal" o "efectiva".
 * @param {string} [data.capitalizacion] - Periodo de capitalización (ej: "mensual"). Opcional.
 * @returns {number} - Tasa efectiva anual en porcentaje.
 */
function convertirTasa(data) {
  const tasaRaw = data["valor_tasa"];     // p.ej. 2 => 2%
  const tipo = data["tipo_tasa"];         // "nominal" o "efectiva"
  const periodo = data["periodo"];        // p.ej. "semestral", "mensual"
  // Si no se especifica la capitalización, asumimos que es el mismo periodo para no romper la conversión.
  const capitalizacion = data["capitalizacion"] || periodo;

  const mPeriodo = periodosPorAño[periodo];
  const mCap = periodosPorAño[capitalizacion];

  if (!mPeriodo) {
    throw new Error(`Periodo no válido: ${periodo}`);
  }
  if (!mCap) {
    throw new Error(`Periodo de capitalización no válido: ${capitalizacion}`);
  }

  // Si la tasa es efectiva: se interpreta "valor_tasa" como la efectiva del periodo, y se anualiza.
  if (tipo === "efectiva") {
    const tasaEfectivaPeriodica = tasaRaw / 100;
    return cambiarTemporalidadEfectiva(tasaEfectivaPeriodica, mPeriodo);
  } 
  // Si la tasa es nominal: convertir primero a nominal anual y luego a efectiva anual.
  else if (tipo === "nominal") {
    // 1) Convertir la tasa nominal del periodo a nominal anual
    // Ej: 2% semestral => 2%*2 = 4% anual
    const nominalPeriodo = tasaRaw / 100; 
    const nominalAnual = nominalPeriodo * mPeriodo;

    // 2) Dividir la tasa nominal anual entre la capitalización deseada
    // Ej: 4% / 12 => 0.0033... (0.33%)
    const subPeriodRate = nominalAnual / mCap;

    // 3) Tasa efectiva anual a partir de la subPeriodRate
    return ((1 + subPeriodRate) ** mCap - 1) * 100;
  } 
  else {
    throw new Error(`Tipo de tasa inválido: ${tipo}`);
  }
}

/**
 * Calcula los intereses compuestos totales a partir de un monto inicial, un plazo en días
 * y una Tasa Efectiva Anual (TEA).
 * 
 * @param {Object} data - Objeto con los datos necesarios.
 * @param {number} tea - Tasa efectiva anual en porcentaje.
 * @returns {number} - Valor en dinero de los intereses generados.
 */
function calcularInteresesCompuestos(data, tea) {
  const montoInicial = parseFloat(data["monto"]);
  const plazoDias = parseFloat(data["plazo_unidad_de_tiempo"]);
  const tasaDecimal = tea / 100;

  if (isNaN(plazoDias) || isNaN(montoInicial)) {
    throw new Error("Monto o plazo no son válidos.");
  }

  const factorTiempo = plazoDias / 365;
  const capitalTotal = montoInicial * Math.pow((1 + tasaDecimal), factorTiempo);
  return capitalTotal - montoInicial;
}

// Variable para conservar la referencia al gráfico, para destruirlo cuando sea necesario
let grafico = null;

/**
 * Genera y muestra un gráfico tipo donut comparando el monto inicial vs. el interés.
 * 
 * @param {number} monto - Monto inicial.
 * @param {number} interes - Interés generado.
 */
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
  // Deshabilitar el botón de enviar
  enviarBtn.disabled = true;

  const nuevaEntrada = mensajeEl.value;
  if (!nuevaEntrada.trim()) return;

  // Mostrar el spinner
  spinnerEl.style.display = "inline-block";

  // Construimos el historial
  historialConversacion += (historialConversacion ? " " : "") + nuevaEntrada;

  try {
    // Enviar la solicitud al backend
    const res = await fetch("http://localhost:3000/chatGPT", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto_usuario: historialConversacion })
    });

    const data = await res.json();

    // Si hay campos faltantes en data.faltantes, el backend lo indicará
    if (data.faltantes) {
      respuestaEl.textContent = data.pregunta;
    } else {
      respuestaEl.textContent = JSON.stringify(data, null, 2);

      try {
        // Convertimos la tasa a efectiva anual
        const tea = convertirTasa(data);
        respuestaTasaEl.textContent = `${tea.toFixed(2)}%`;

        // Calculamos el interés compuesto
        const interes = calcularInteresesCompuestos(data, tea);
        respuestaInteresEl.textContent = `${interes.toLocaleString('es-ES', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 0 
        })} COP`;

        // Generar gráfico
        generarGrafico(data.monto, interes);

        // Si deseas reiniciar la conversación en cada petición exitosa:
        // historialConversacion = "";
      } catch (error) {
        respuestaTasaEl.textContent = `Error en conversión: ${error.message}`;
        respuestaInteresEl.textContent = "";
      }
    }
  } catch (error) {
    console.error("Error:", error);
    respuestaEl.textContent = "Error al procesar la solicitud.";
  } finally {
    // Ocultar el spinner
    spinnerEl.style.display = "none";
    // NO limpiamos el contenido del textarea para que se conserve
    // mensajeEl.value = ""; // <--- Eliminado
  }
});

/* Evento para Reiniciar */
reiniciarBtn.addEventListener("click", () => {
  // Rehabilitar el botón de enviar
  enviarBtn.disabled = false;

  // Mantenemos el texto ingresado, por lo que no tocamos mensajeEl.value

  // Reseteamos las respuestas
  respuestaEl.textContent = "Esperando entrada...";
  respuestaTasaEl.textContent = "";
  respuestaInteresEl.textContent = "";

  // Limpiamos el historial de conversación (opcional)
  // Si quieres mantenerlo, comenta esta línea
  historialConversacion = "";

  if (grafico instanceof Chart) grafico.destroy();
  // Dejaría la caja de texto con lo que se escribió
});