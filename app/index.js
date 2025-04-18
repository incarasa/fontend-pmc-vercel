/* 
  ==============================
  = Variables y funciones      =
  ==============================
*/

let ultimaRespuesta = null;
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
 *   3) Esa tasa es la "tasa por subperiodo" (nominal anual / mCap).
 *   4) Finalmente, se convierte esa tasa de subperiodo a efectiva anual con la
 *      fórmula (1 + subPeriodRate)^(mCap) - 1.
 * 
 * Ejemplo: Tasa nominal semestral mes vencido de 2%.
 * - Paso 1: nominal anual = 2% * 2 = 4% anual
 * - Paso 2: capitalización mensual => 4% / 12 = 0.0033... (0.33%)
 * - Paso 3: Efectiva Anual = (1 + 0.0033...)^12 - 1 => ~4.07%.
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
 * Calcula los intereses totales de un crédito a cuota fija (sistema francés),
 * tomando en cuenta que el plazo se ingresa en días y se convierte a meses.
 * 
 * Pasos:
 * 1) Convertir la TEA a decimal.
 * 2) Sacar la Tasa Efectiva Mensual (TEM): (1 + TEA_decimal)^(1/12) - 1.
 * 3) Convertir plazo en días a meses: n = Math.ceil(plazoDias / 30).
 * 4) Calcular la cuota con la fórmula de francés: 
 *     cuota = M * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ],
 *    donde M es el monto, i la TEM y n el número de meses.
 * 5) intereses = (cuota * n) - M.
 * 
 * @param {Object} data - Objeto con los datos necesarios.
 * @param {number} tea - Tasa efectiva anual en porcentaje.
 * @returns {number} - Valor en dinero de los intereses generados.
 */
function calcularInteresesCompuestos(data, tea) {
  const montoInicial = parseFloat(data["monto"]);
  const plazoDias = parseFloat(data["plazo_unidad_de_tiempo"]);

  if (isNaN(plazoDias) || isNaN(montoInicial)) {
    throw new Error("Monto o plazo no son válidos.");
  }

  // 1) Convertir la TEA a decimal
  const teaDecimal = tea / 100;

  // 2) Tasa Efectiva Mensual (TEM)
  const i = Math.pow(1 + teaDecimal, 1 / 12) - 1;

  // 3) Convertir días a meses, redondeando hacia arriba
  const n = Math.ceil(plazoDias / 30);

  // 4) Calcular la cuota (sistema francés)
  //    cuota = P * [ i(1 + i)^n / ((1 + i)^n - 1) ]
  if (n <= 0) {
    throw new Error("El plazo convertido a meses no puede ser 0 o negativo.");
  }

  const factor = Math.pow(1 + i, n);
  const cuota = montoInicial * ( i * factor ) / ( factor - 1 );

  // 5) Sumar pagos y restar capital
  const totalPagado = cuota * n;
  const intereses = totalPagado - montoInicial;

  return intereses;
}

// Variable para conservar la referencia al gráfico, para destruirlo cuando sea necesario
let grafico = null;

/**
 * Genera y muestra un gráfico tipo donut comparando el monto inicial vs. el interés.
 * 
 * @param {number} monto - Monto inicial.
 * @param {number} interes - Interés calculado.
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
      ultimaRespuesta = data;

      try {
        // Convertimos la tasa a efectiva anual
        const tea = convertirTasa(data);
        respuestaTasaEl.textContent = `${tea.toFixed(2)}%`;

        // Calculamos el interés (con el nuevo método)
        const interes = calcularInteresesCompuestos(data, tea);
        respuestaInteresEl.textContent = `${interes.toLocaleString('es-ES', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 0 
        })} COP`;

        // Generar gráfico
        generarGrafico(data.monto, interes);

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
    // No limpiamos el contenido del textarea para que se conserve
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

// Botón de compartir

function generarEnlace(data) {
  const base64 = btoa(JSON.stringify(data));
  return `${window.location.origin}/app/compartido.html?data=${base64}`;
}



async function acortarEnlace(enlaceLargo) {
  try {
    const res = await fetch(`https://api.tinyurl.com/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer FUJUHFl3afF0YKJqRUBC6CLnv8doRvldCzEYX0zWDuSWdRaFHxmO7Tzs9FRm"
      },
      body: JSON.stringify({
        url: enlaceLargo,
        domain: "tinyurl.com"
      })
    });

    const json = await res.json();
    return json.data?.tiny_url || enlaceLargo;
  } catch (error) {
    console.error("Error acortando URL:", error);
    return enlaceLargo; // fallback
  }
}


document.getElementById("compartirBtn").addEventListener("click", () => {
  const datos = {
    mensaje: document.getElementById("mensaje").value,
    respuesta: document.getElementById("respuesta").innerText,
    tasa: document.getElementById("respuestaTasa").innerText,
    interes: document.getElementById("respuestaInteres").innerText,
    monto: ultimaRespuesta.monto
  };

  abrirModalConEnlace(datos);
});

async function abrirModalConEnlace(data) {
  const enlaceLargo = generarEnlace(data); 
  const enlaceCorto = await acortarEnlace(enlaceLargo); 
  document.getElementById("inputEnlaceCompartir").value = enlaceCorto; 
  document.getElementById("modalCompartir").classList.remove("oculto");
}


function copiarEnlace() {
  const input = document.getElementById("inputEnlaceCompartir");
  input.select();
  input.setSelectionRange(0, 99999); // Compatibilidad móvil
  document.execCommand("copy");

  // Opcional: notificación rápida
  alert("¡Enlace copiado al portapapeles!");
}


function cerrarModal() {
  document.getElementById("modalCompartir").classList.add("oculto");
}


// Botones de compartir en apps

function compartirWhatsapp(){
  const enlace = document.getElementById("inputEnlaceCompartir").value;
  const mensaje = `¡Mira esta consulta financiera que hice en Qredi! ${enlace}`;
  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}