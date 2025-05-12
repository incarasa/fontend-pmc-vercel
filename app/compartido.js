// compartido.js

/*
  ==============================
  = Variables y funciones      =
  = (Copy relevant functions   =
  = from index.js here)        =
  ==============================
*/

// You need to copy these calculation functions and helper functions
// from your index.js and paste them here.

/**
 * Objeto que define cuántos periodos hay en un año, según la temporalidad.
 * (COPY FROM index.js)
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
 * (COPY FROM index.js)
 */
function cambiarTemporalidadEfectiva(tasa, periodos) {
  return ((1 + tasa) ** periodos - 1) * 100;
}

/**
 * Convierte una tasa ingresada (puede ser nominal o efectiva) a Tasa Efectiva Anual (TEA).
 * (COPY FROM index.js)
 */
function convertirTasa(data) {
   const tasaRaw = parseFloat(data["valor_tasa"]);
   const tipo = data["tipo_tasa"];
   const periodo = data["periodo"];
   const capitalizacion = data["capitalizacion"] || periodo;

    if (isNaN(tasaRaw)) {
        throw new Error("El valor de la tasa no es un número válido.");
    }

   const mPeriodo = periodosPorAño[periodo.toLowerCase()];
   const mCap = periodosPorAño[capitalizacion.toLowerCase()];

   if (!mPeriodo) {
     throw new Error(`Periodo no válido: "${periodo}".`);
   }
   if (!mCap) {
     throw new Error(`Periodo de capitalización no válido: "${capitalizacion}".`);
   }

   if (tipo === "efectiva") {
     const tasaEfectivaPeriodica = tasaRaw / 100;
      if (tasaEfectivaPeriodica < 0) throw new Error("La tasa efectiva no puede ser negativa.");
     // There was a typo here 'cambiarTemporalidadEfectidad', correcting to 'cambiarTemporalidadEfectiva'
     return cambiarTemporalidadEfectiva(tasaEfectivaPeriodica, mPeriodo);
   } else if (tipo === "nominal") {
     const nominalPeriodo = tasaRaw / 100;
      if (nominalPeriodo < 0) throw new Error("La tasa nominal no puede ser negativa.");
     const nominalAnual = nominalPeriodo * mPeriodo;
     const subPeriodRate = nominalAnual / mCap;
      if (subPeriodRate < 0) throw new Error("La tasa por subperiodo no puede ser negativa.");
     return ((1 + subPeriodRate) ** mCap - 1) * 100;
   } else {
     throw new Error(`Tipo de tasa inválido: "${tipo}".`);
   }
}


/**
 * Calcula los intereses totales de un crédito.
 * (COPY FROM index.js)
 */
function calcularInteresesCompuestos(data, tea) {
  const montoInicial = parseFloat(data["monto"]);
  const plazoDias = parseFloat(data["plazo_unidad_de_tiempo"]);

  if (isNaN(plazoDias) || isNaN(montoInicial) || montoInicial <= 0 || plazoDias <= 0) {
    throw new Error("Monto o plazo no son válidos. Deben ser números positivos.");
  }
   if (tea < 0) {
       throw new Error("La TEA no puede ser negativa para el cálculo de intereses.");
   }

  const teaDecimal = tea / 100;
  const i = Math.pow(1 + teaDecimal, 1 / 12) - 1;
  const n = Math.ceil(plazoDias / 30);

   if (n <= 0) {
     throw new Error("El plazo convertido a meses no puede ser 0 o negativo.");
   }

   let cuota;
   if (i === 0) {
       cuota = montoInicial / n;
   } else {
      const factor = Math.pow(1 + i, n);
      if (factor - 1 === 0) {
          throw new Error("Error de cálculo de cuota (factor denominador es cero).");
      }
      cuota = montoInicial * ( i * factor ) / ( factor - 1 );
   }

  const totalPagado = cuota * n;
  const intereses = totalPagado - montoInicial;

  return Math.max(0, intereses);
}


// Helper function to format currency (COPY FROM index.js if you added it there)
function formatCurrency(value) {
     const num = parseFloat(value);
     if (isNaN(num)) return '--';
     return `${num.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
}

// Helper function to escape HTML for displaying user input/JSON safely
function escapeHTML(str) {
   if (typeof str !== 'string') return str;
   return str.replace(/[&<>"']/g, function(match) {
       const escape = {
           '&': '&amp;',
           '<': '&lt;',
           '>': '&gt;',
           '"': '&quot;',
           "'": '&#039;'
       };
       return escape[match];
   });
}


// Variable to manage multiple chart instances, keyed by canvas ID.
let chartInstances = {};


/**
 * Generates a doughnut chart on a given canvas.
 * Modified to accept the canvas element directly.
 *
 * @param {HTMLCanvasElement} canvasElement - The canvas element to draw on.
 * @param {number} monto - Initial amount (numeric).
 * @param {number} interes - Calculated interest (numeric).
 */
function generarGrafico(canvasElement, monto, interes) {
  const ctx = canvasElement.getContext('2d');

  // Destroy previous chart instance on this canvas if it exists
  if (chartInstances[canvasElement.id] instanceof Chart) {
      chartInstances[canvasElement.id].destroy();
      delete chartInstances[canvasElement.id]; // Remove from map
  }

  const total = monto + interes; // Calculate total for percentage tooltip

  chartInstances[canvasElement.id] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Monto Inicial', 'Interés Calculado'],
      datasets: [{
        label: 'Distribución del Total',
        data: [monto, interes], // Use numeric values directly
        backgroundColor: ['#36A2EB', '#FF6384'], // Example colors
        hoverOffset: 20
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
         tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.label || '';
                    if (label) {
                        label += ': ';
                    }
                    const value = context.raw;
                    const percentage = ((value / total) * 100).toFixed(1) + '%';
                     // Format value with commas
                    label += `${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP (${percentage})`;
                    return label;
                }
            }
        }
      }
    }
  });
}


// Function to decode and display shared data
function mostrarConsultaCompartida() {
  console.log('mostrarConsultaCompartida started'); // Log start

  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('data');
  const resultsContainer = document.getElementById('resultsContainer'); // Get the container

  if (!resultsContainer) {
      console.error("Container #resultsContainer not found!");
      // You might want to display an error message on the page here too
      document.body.innerHTML = '<p>Error interno: Contenedor de resultados no encontrado.</p>';
      return;
  }

  console.log('Data param found:', !!dataParam); // Log if data param exists

  if (!dataParam) {
    resultsContainer.innerHTML = '<p>No se encontró información para mostrar.</p>';
    console.log('No data param found, displaying default message.');
    return;
  }

  let creditResults;
  try {
    const decoded = atob(dataParam);
    creditResults = JSON.parse(decoded); // Expect an array now
    console.log('Decoded and parsed data:', creditResults); // Log the parsed data
    console.log('Is data an Array:', Array.isArray(creditResults), 'Length:', creditResults?.length); // Log array check results

  } catch (error) {
     console.error("Error al decodificar o parsear datos:", error); // Log decoding/parsing errors
     resultsContainer.innerHTML = '<p>Error al cargar los datos. El enlace podría ser inválido.</p>';
     return;
  }

  // THIS IS THE CHECK THAT'S FAILING - Let's see the logs above this line
  if (!Array.isArray(creditResults) || creditResults.length === 0) {
       resultsContainer.innerHTML = '<p>No se encontraron resultados válidos para mostrar.</p>';
       console.log('Array is empty or invalid, displaying default message.');
       return;
  }

  // If we get here, the array is valid and not empty.
  console.log('Data is a valid non-empty array. Proceeding to display...');
  // Clear any initial content or placeholder in the container
  resultsContainer.innerHTML = '';

  // Loop through each credit result in the array
  creditResults.forEach((creditData, index) => {
      console.log(`Processing credit index: ${index}`, creditData); // Log each item being processed

      // --- START OF CODE TO BE INSIDE THE FOREACH LOOP ---

      const originalMessage = creditData.originalMessage || "(sin mensaje)";
      const rawApiResponse = creditData.rawApiResponse;

      let teaDisplay = '--';
      let interesDisplay = '--';
      let montoDisplay = '--';
      let montoNumericoForChart = NaN;
      let interesNumericoForChart = NaN;


      // Attempt to calculate/format TEA and Interest using copied functions
      if (rawApiResponse) {
           if (rawApiResponse.monto !== undefined && !isNaN(parseFloat(rawApiResponse.monto))) {
               montoDisplay = formatCurrency(rawApiResponse.monto);
               montoNumericoForChart = parseFloat(rawApiResponse.monto); // Use raw monto for chart data source
           }

          try {
              // Need to ensure data for convertirTasa and calcularInteresesCompuestos is passed correctly
              // The rawApiResponse object should contain the necessary fields (valor_tasa, periodo, tipo_tasa, monto, plazo_unidad_de_tiempo, capitalizacion)
              const calculatedTea = convertirTasa(rawApiResponse);
              teaDisplay = `${calculatedTea.toFixed(2)}%`;

              // Recalculate interest based on the raw API data and calculated TEA
               const calculatedInteres = calcularInteresesCompuestos(rawApiResponse, calculatedTea);
               interesDisplay = formatCurrency(calculatedInteres);
               interesNumericoForChart = calculatedInteres; // Use calculated interest for chart data source


          } catch (e) {
              console.warn(`Error calculating TEA/Interest for credit ${index + 1}:`, rawApiResponse, e); // Log the data being processed
              teaDisplay = `Error: ${e.message}`;
              interesDisplay = `Error: ${e.message}`;
          }
      }


      // Construct the HTML for a single credit result block
      const creditBlockHTML = `
          <div class="shared-credit-result" data-credit-index="${index}">
              <h3>Crédito ${index + 1}</h3>

              <div class="bloque">
                  <h4>Mensaje original:</h4>
                  <p class="subtitulo">${escapeHTML(originalMessage)}</p> </div>

              <div class="bloque">
                  <h4>Respuesta del asistente (JSON):</h4>
                  <pre>${escapeHTML(JSON.stringify(rawApiResponse, null, 2) || "(sin respuesta)")}</pre> </div>

              <div class="resultados">
                   <div>
                      <div class="resultado-label">Monto inicial</div>
                      <span class="resultado-valor">${montoDisplay}</span>
                  </div>
                  <div>
                      <div class="resultado-label">TEA (Tasa Efectiva Anual)</div>
                      <span class="resultado-valor">${teaDisplay}</span>
                  </div>
                  <div>
                      <div class="resultado-label">Interés Total Calculado</div>
                      <span class="resultado-valor">${interesDisplay}</span>
                  </div>
                   <canvas id="graficoTasaCompartida_${index}" width="400" height="200"></canvas>
              </div>
          </div>
      `;

      // Append the new block HTML to the container
      resultsContainer.insertAdjacentHTML('beforeend', creditBlockHTML);

      // Find the dynamically created canvas element using its unique ID
      const canvasElement = document.getElementById(`graficoTasaCompartida_${index}`);

      // Draw the chart using the *numeric* values derived from the raw data
      if (canvasElement && !isNaN(montoNumericoForChart) && !isNaN(interesNumericoForChart)) {
          generarGrafico(canvasElement, montoNumericoForChart, interesNumericoForChart);
      } else {
          console.warn(`Skipping chart for credit ${index + 1}: Invalid monto (${montoNumericoForChart}) or interes (${interesNumericoForChart}). Clearing canvas.`);
           // Clear the canvas area if no chart is drawn
           if(canvasElement) {
               const ctx = canvasElement.getContext('2d');
               ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
           }
      }

      console.log(`Finished processing index: ${index}`); // Log end of processing for item

      // --- END OF CODE TO BE INSIDE THE FOREACH LOOP ---

  }); // End forEach loop

  console.log('mostrarConsultaCompartida finished.'); // Log end

}

// Execute the display function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', mostrarConsultaCompartida); // Keep this