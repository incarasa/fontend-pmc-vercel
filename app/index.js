/*
  ==============================
  = Variables y funciones      =
  ==============================
*/

// Variable to store the data of the last successfully processed request,
// primarily used for the sharing feature.


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
 * (Kept the original logic as it seems correct based on your description)
 *
 * @param {Object} data
 * @param {number} data.valor_tasa - Valor numérico de la tasa, ej: 2 => 2%.
 * @param {string} data.periodo - Periodo base de la tasa (ej: "mensual", "semestral").
 * @param {string} data.tipo_tasa - "nominal" o "efectiva".
 * @param {string} [data.capitalizacion] - Periodo de capitalización (ej: "mensual"). Opcional.
 * @returns {number} - Tasa efectiva anual en porcentaje.
 */
function convertirTasa(data) {
  const tasaRaw = parseFloat(data["valor_tasa"]);     // p.ej. 2 => 2%
  const tipo = data["tipo_tasa"];         // "nominal" o "efectiva"
  const periodo = data["periodo"];        // p.ej. "semestral", "mensual"
  // Si no se especifica la capitalización, asumimos que es el mismo periodo para no romper la conversión.
  const capitalizacion = data["capitalizacion"] || periodo;

   if (isNaN(tasaRaw)) {
      throw new Error("El valor de la tasa no es un número válido.");
   }


  const mPeriodo = periodosPorAño[periodo.toLowerCase()]; // Use toLowerCase for robustness
  const mCap = periodosPorAño[capitalizacion.toLowerCase()]; // Use toLowerCase for robustness

  if (!mPeriodo) {
    throw new Error(`Periodo no válido: "${periodo}". Opciones: ${Object.keys(periodosPorAño).join(', ')}.`);
  }
  if (!mCap) {
    throw new Error(`Periodo de capitalización no válido: "${capitalizacion}". Opciones: ${Object.keys(periodosPorAño).join(', ')}.`);
  }

  // Si la tasa es efectiva: se interpreta "valor_tasa" como la efectiva del periodo, y se anualiza.
  if (tipo === "efectiva") {
    const tasaEfectivaPeriodica = tasaRaw / 100;
    // Ensure rate is non-negative for calculation
    if (tasaEfectivaPeriodica < 0) throw new Error("La tasa efectiva no puede ser negativa.");
    return cambiarTemporalidadEfectiva(tasaEfectivaPeriodica, mPeriodo);
  }
  // Si la tasa es nominal: convertir primero a nominal anual y luego a efectiva anual.
  else if (tipo === "nominal") {
    // 1) Convertir la tasa nominal del periodo a nominal anual
    // Ej: 2% semestral => 2%*2 = 4% anual
    const nominalPeriodo = tasaRaw / 100;
     // Ensure rate is non-negative for calculation
    if (nominalPeriodo < 0) throw new Error("La tasa nominal no puede ser negativa.");

    const nominalAnual = nominalPeriodo * mPeriodo;

    // 2) Dividir la tasa nominal anual entre la capitalización deseada
    // Ej: 4% / 12 => 0.0033... (0.33%)
    const subPeriodRate = nominalAnual / mCap;

    // 3) Tasa efectiva anual a partir de la subPeriodRate
     // Ensure rate is non-negative for calculation
    if (subPeriodRate < 0) throw new Error("La tasa por subperiodo no puede ser negativa.");

    return ((1 + subPeriodRate) ** mCap - 1) * 100;
  }
  else {
    throw new Error(`Tipo de tasa inválido: "${tipo}". Opciones: "nominal", "efectiva".`);
  }
}


/**
 * Calcula los intereses totales de un crédito a cuota fija (sistema francés),
 * tomando en cuenta que el plazo se ingresa en días y se convierte a meses.
 * (Kept the original logic)
 *
 * @param {Object} data - Objeto con los datos necesarios (debe contener monto y plazo_unidad_de_tiempo).
 * @param {number} tea - Tasa efectiva anual en porcentaje.
 * @returns {number} - Valor en dinero de los intereses generados.
 */
function calcularInteresesCompuestos(data, tea) {
  const montoInicial = parseFloat(data["monto"]);
  const plazoDias = parseFloat(data["plazo_unidad_de_tiempo"]); // Assumes API provides plazo in days

  if (isNaN(plazoDias) || isNaN(montoInicial) || montoInicial <= 0 || plazoDias <= 0) {
    throw new Error("Monto o plazo no son válidos. Deben ser números positivos.");
  }
   if (tea < 0) {
       throw new Error("La TEA no puede ser negativa para el cálculo de intereses.");
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
     // This case should ideally be caught by plazoDias <= 0 check above, but defensive check.
    throw new Error("El plazo convertido a meses no puede ser 0 o negativo.");
  }

  let cuota;
  if (i === 0) { // Handle zero interest rate case
      cuota = montoInicial / n;
  } else {
     const factor = Math.pow(1 + i, n);
     if (factor - 1 === 0) { // Prevent division by zero if factor is exactly 1 (shouldn't happen with i > 0 and n > 0)
         throw new Error("Error de cálculo de cuota (factor denominador es cero).");
     }
     cuota = montoInicial * ( i * factor ) / ( factor - 1 );
  }


  // 5) Sumar pagos y restar capital
  const totalPagado = cuota * n;
  const intereses = totalPagado - montoInicial;

  // Return 0 if calculated interest is negative (can happen with floating point errors on very low/zero rates)
  return Math.max(0, intereses);
}

// Variable to manage multiple chart instances.
// We will store chart instances keyed by their canvas element ID.
let chartInstances = {};

/**
 * Genera y muestra un gráfico tipo donut comparando el monto inicial vs. el interés.
 * Modified to accept the canvas element directly.
 *
 * @param {HTMLCanvasElement} canvasElement - The canvas element to draw on.
 * @param {number} monto - Monto inicial.
 * @param {number} interes - Interés calculado.
 */
function generarGrafico(canvasElement, monto, interes) {
  const ctx = canvasElement.getContext('2d');

  // Destroy previous chart instance on this canvas if it exists
  if (chartInstances[canvasElement.id] instanceof Chart) {
      chartInstances[canvasElement.id].destroy();
      delete chartInstances[canvasElement.id]; // Remove from map
  }

  const total = monto + interes;

  chartInstances[canvasElement.id] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Monto Inicial', 'Interés Calculado'],
      datasets: [{
        label: 'Distribución del Total',
        data: [monto, interes],
        backgroundColor: ['#36A2EB', '#FF6384'], // Example colors
        hoverOffset: 20
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { // Add tooltips for better data visibility
            callbacks: {
                label: function(context) {
                    let label = context.label || '';
                    if (label) {
                        label += ': ';
                    }
                    const value = context.raw;
                    const percentage = ((value / total) * 100).toFixed(1) + '%';
                    label += `${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP (${percentage})`;
                    return label;
                }
            }
        }
      }
    }
  });
}


/*
  ==============================
  = Manejo de la Interfaz      =
  ==============================
*/

// Removed historialConversacion as each section is independent
// let historialConversacion = "";

// Get references to static elements (container, add button, share button)
const contenedor = document.querySelector(".contenedor");
const addCreditBtn = document.getElementById("addCreditBtn");
const compartirBtn = document.getElementById("compartirBtn");

// Counter for new credit sections (index 0 is the first one in HTML)
let creditSectionCounter = 1;

// Get the HTML structure of the first credit section to use as a template
const firstCreditSection = document.querySelector('.credit-section[data-credit-index="0"]');
const creditSectionTemplateHTML = firstCreditSection.innerHTML; // Capture the inner structure


/**
 * Adds a new credit section to the DOM.
 */
function addCreditSection() {
     // Build the HTML string for the new section, replacing dynamic parts
    const newSectionHTML = `
        <div class="credit-section" data-credit-index="${creditSectionCounter}">
            <h3>Crédito ${creditSectionCounter + 1}</h3>
            ${creditSectionTemplateHTML
                .replace(/mensaje_0/g, `mensaje_${creditSectionCounter}`) // Replace IDs dynamically
                .replace(/respuesta_0/g, `respuesta_${creditSectionCounter}`)
                .replace(/respuestaTasa_0/g, `respuestaTasa_${creditSectionCounter}`)
                .replace(/respuestaInteres_0/g, `respuestaInteres_${creditSectionCounter}`)
                .replace(/graficoTasa_0/g, `graficoTasa_${creditSectionCounter}`)
                 // Replace data-credit-index on buttons
                .replace(/data-credit-index="0"/g, `data-credit-index="${creditSectionCounter}"`)
            }
        </div>
    `;

    // Insert the new section before the "Más Créditos" button
    addCreditBtn.insertAdjacentHTML('beforebegin', newSectionHTML);

    // Find the newly added textarea and clear its content
    const newSection = contenedor.querySelector(`.credit-section[data-credit-index="${creditSectionCounter}"]`);
    const newTextarea = newSection.querySelector('textarea');
     if (newTextarea) {
        newTextarea.value = ''; // Clear the textarea content
    }

    // Increment the counter for the next section
    creditSectionCounter++;
}

// Add event listener to the "Más Créditos" button
addCreditBtn.addEventListener('click', addCreditSection);


/*
  =============================================
  = Event Handlers using Event Delegation     =
  =============================================
  Handle clicks on 'Enviar' and 'Reiniciar' buttons dynamically
  regardless of when they were added to the DOM.
*/



// FIND THIS LARGE EVENT LISTENER ATTACHED TO 'contenedor'
contenedor.addEventListener('click', async (event) => {
    const target = event.target;

    // Handle Send Button Click  <-- THIS IS THE BLOCK I WAS REFERRING TO
    if (target.matches('.enviar-btn')) {
        // ... (code to get button, find section, get elements) ...
        const button = target; // You use 'button' later, so this is good
        const creditSection = button.closest('.credit-section'); // This finds the correct section
        const creditIndex = creditSection.dataset.creditIndex;

        // Get references to the elements specific to THIS section
        const mensajeTextarea = creditSection.querySelector(`textarea`);
        const respuestaPre = creditSection.querySelector(`pre`);
        const respuestaTasaSpan = creditSection.querySelector(`#respuestaTasa_${creditIndex}`);
        const respuestaInteresSpan = creditSection.querySelector(`#respuestaInteres_${creditIndex}`);
        const graficoCanvas = creditSection.querySelector(`#graficoTasa_${creditIndex}`);
        const spinner = button.querySelector('.spinner');

        const mensaje = mensajeTextarea.value.trim();
        if (!mensaje) { /* ... */ return; }

        // Show loading state ...
        spinner.style.display = 'inline-block';
        button.disabled = true;
        respuestaPre.textContent = 'Consultando a Qredi...';
        respuestaTasaSpan.textContent = '--';
        respuestaInteresSpan.textContent = '--';
        if (chartInstances[graficoCanvas.id] instanceof Chart) { /* ... */ }

        try {
            // Fetch API code ...
            const res = await fetch("https://backend-pmc.onrender.com/chatGPT", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Sending only the current text_usuario, not historical context
                body: JSON.stringify({ texto_usuario: mensaje })
            });
            if (!res.ok) { /* ... */ }
            const data = await res.json(); // <-- You get the data here

            // If there are missing fields ...
            if (data.faltantes) {
                respuestaPre.textContent = data.pregunta || "Por favor, especifica el monto, tasa, tipo de tasa y plazo.";
                 respuestaTasaSpan.textContent = '--';
                 respuestaInteresSpan.textContent = '--';
                 // Do not store data if the API indicates missing fields
                 // You can optionally add: creditSection.apiResponseData = null; here
            } else {
                // *** MAKE THE CHANGE HERE! ***
                try {
                  // Acceder a los valores individuales del JSON
                  const tipoTasa = data.tipo_tasa || "N/A";
                  const valorTasa = data.valor_tasa ? `${data.valor_tasa}%` : "N/A";
                  const plazo = data.plazo_unidad_de_tiempo ? `${data.plazo_unidad_de_tiempo} días` : "N/A";
                  const monto = data.monto ? `${parseFloat(data.monto).toLocaleString('es-ES')} COP` : "N/A";
              
                  // Crear una tarjeta visualmente atractiva para mostrar los resultados
                  respuestaPre.innerHTML = `
                      <div class="respuesta-tarjeta">
                          <div class="respuesta-item">
                              <span class="respuesta-label">💼 Tipo de Tasa:</span>
                              <span class="respuesta-valor">${tipoTasa}</span>
                          </div>
                          <div class="respuesta-item">
                              <span class="respuesta-label">📊 Valor de Tasa:</span>
                              <span class="respuesta-valor">${valorTasa}</span>
                          </div>
                          <div class="respuesta-item">
                              <span class="respuesta-label">⏳ Plazo:</span>
                              <span class="respuesta-valor">${plazo}</span>
                          </div>
                          <div class="respuesta-item">
                              <span class="respuesta-label">💰 Monto:</span>
                              <span class="respuesta-valor">${monto}</span>
                          </div>
                      </div>
                  `;
              
                  // Guardar el objeto completo como dato del elemento para reutilización posterior
                  creditSection.apiResponseData = data;
              
                  // Mostrar la TEA e interés calculado
                  const tea = convertirTasa(data);
                  respuestaTasaSpan.textContent = `${tea.toFixed(2)}%`;
              
                  const interes = calcularInteresesCompuestos(data, tea);
                  respuestaInteresSpan.textContent = `${interes.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
              
                  // Generar el gráfico si el monto es válido
                  if (data.monto !== undefined && !isNaN(parseFloat(data.monto))) {
                      generarGrafico(graficoCanvas, parseFloat(data.monto), interes);
                  }
              } catch (error) {
                  respuestaPre.textContent = "❌ Error al procesar los datos.";
                  console.error("Error al mostrar los valores: ", error);
              }
              

                // *** ADD THIS LINE: Store the raw API response data on the section element ***
                creditSection.apiResponseData = data;

                // *** REMOVE OR COMMENT OUT THIS LINE that uses the global variable: ***
                // ultimaRespuesta = data; // <--- Remove or comment this out

                try {
                    // Convert the rate to effective annual (TEA)
                    const tea = convertirTasa(data);
                    respuestaTasaSpan.textContent = `${tea.toFixed(2)}%`;

                    // Calculate interest
                    const interes = calcularInteresesCompuestos(data, tea);
                     respuestaInteresSpan.textContent = `${interes.toLocaleString('es-ES', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    })} COP`;

                    // Generate chart using the data...
                     if (data.monto !== undefined && !isNaN(parseFloat(data.monto))) {
                         generarGrafico(graficoCanvas, parseFloat(data.monto), interes);
                     } else { /* ... */ }


                } catch (error) {
                     // ... (handle calculation errors) ...
                     // Optionally clear stored data here too if calculation fails
                     // creditSection.apiResponseData = null;
                }
            }
        } catch (error) {
            // ... (handle fetch errors) ...
             // On fetch error, clear the stored data for this section
             creditSection.apiResponseData = null;
        } finally {
            // Hide loading state ...
            spinner.style.display = 'none';
            button.disabled = false;
        }
    } // End of if (target.matches('.enviar-btn'))

    // Handle Reset Button Click
    if (target.matches('.reiniciar-btn')) {
        const button = target;
        const creditSection = button.closest('.credit-section'); // Find the parent section
        const creditIndex = creditSection.dataset.creditIndex; // Get the index

        // Get references to the elements specific to THIS section
        const mensajeTextarea = creditSection.querySelector(`textarea`);
        const respuestaPre = creditSection.querySelector(`pre`);
        const respuestaTasaSpan = creditSection.querySelector(`#respuestaTasa_${creditIndex}`);
        const respuestaInteresSpan = creditSection.querySelector(`#respuestaInteres_${creditIndex}`);
        const graficoCanvas = creditSection.querySelector(`#graficoTasa_${creditIndex}`);
        const enviarButton = creditSection.querySelector('.enviar-btn');


        mensajeTextarea.value = '';
        respuestaPre.textContent = 'Esperando entrada...';
        respuestaTasaSpan.textContent = '--';
        respuestaInteresSpan.textContent = '--';

        // Destroy the chart instance if it exists for this canvas
        if (chartInstances[graficoCanvas.id] instanceof Chart) {
            chartInstances[graficoCanvas.id].destroy();
             delete chartInstances[graficoCanvas.id]; // Remove from map
        }

        // Ensure the Send button is enabled
        if(enviarButton) enviarButton.disabled = false;

        // Note: This reset only clears the UI for this section.
        // historialConversacion is no longer used per section.
        // ultimaRespuesta is not cleared here as it tracks the *last* overall result.
    }

}); // End of contenedor.addEventListener



/*
  ==============================
  = Sharing Functionality      =
  ==============================
  (Modified to use ultimaRespuesta for data)
*/

// Helper to generate shareable link from data
function generarEnlace(dataArray) { // <--- Parameter is an array
   if (!dataArray || dataArray.length === 0) return null; // Cannot generate link without data

   const dataToEncode = JSON.stringify(dataArray); // <--- Stringifies the entire array
   const base64 = btoa(dataToEncode);

    // Ensure the shared page path is correct (e.g., /app/compartido.html)
   // ADJUST THIS PATH if your compartido.html is not in the /app directory
   const compartidoPagePath = "/compartido.html"; // Example path - ADJUST THIS if needed

   return `${window.location.origin}${compartidoPagePath}?data=${base64}`;
}


// Helper to shorten the URL (uses TinyURL API)
async function acortarEnlace(enlaceLargo) {
  // API Key is hardcoded here - consider securing this in a backend
  const TINYURL_API_KEY = "FUJUHFl3afF0YKJqRUBC6CLnv8doRvldCzEYX0zWDuSWdRaFHxmO7z9FRm"; // **VERIFY & SECURE THIS KEY**

  try {
    const res = await fetch(`https://api.tinyurl.com/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer FUJUHFl3afF0YKJqRUBC6CLnv8doRvldCzEYX0zWDuSWdRaFHxmO7Tzs9FRm` // Use template literal
      },
      body: JSON.stringify({
        url: enlaceLargo,
        domain: "tinyurl.com" // Or your custom domain if configured
      })
    });

    if (!res.ok) {
        // Handle API errors (e.g., invalid URL, rate limits)
        const errorBody = await res.text(); // Read error body
        console.error(`TinyURL API error: ${res.status}`, errorBody);
        throw new Error(`TinyURL API returned status ${res.status}`);
    }

    const json = await res.json();
    if (json && json.data && json.data.tiny_url) {
        return json.data.tiny_url;
    } else {
         console.error("TinyURL API response missing tiny_url:", json);
         return enlaceLargo; // Fallback if response format is unexpected
    }

  } catch (error) {
    console.error("Error acortando URL:", error);
    showMessage("⚠️ Error al acortar el enlace. Compartiendo el enlace largo.", "warning");
    return enlaceLargo; // fallback to original link
  }
}


// Event listener for the Share button
compartirBtn.addEventListener("click", async () => {
  const allCreditSections = document.querySelectorAll('.credit-section');
  const dataToShare = [];

  allCreditSections.forEach(section => {
    const originalMessage = section.querySelector('textarea').value.trim();
    // Retrieve the stored raw API response data from the section element
    // This relies on the handleSendClick function storing it successfully
    const rawApiResponseData = section.apiResponseData; // Access property set in handleSendClick

    // Only include sections that have successfully processed an API response
    if (rawApiResponseData) {
        dataToShare.push({
            originalMessage: originalMessage,
            rawApiResponse: rawApiResponseData // Include the full JSON response object
            // We will recalculate/format TEA, Interest, Monto in compartido.js
        });
    }
  });

  if (dataToShare.length === 0) {
      showMessage("☝️ Simula al menos un crédito primero para poder compartir.", "info");
      return;
  }

  // Generate and share the link with the array of data
  abrirModalConEnlace(dataToShare); // Pass the array
});


// Function to open the share modal with a generated link
async function abrirModalConEnlace(data) {
   const enlaceLargo = generarEnlace(data);

   if (!enlaceLargo) {
       showMessage("❌ No se pudo generar el enlace para compartir.", "error");
       return;
   }

  const enlaceCorto = await acortarEnlace(enlaceLargo);
  document.getElementById("inputEnlaceCompartir").value = enlaceCorto;
  document.getElementById("modalCompartir").classList.remove("oculto");
}


// Helper to copy the link to the clipboard
function copiarEnlace() {
  const input = document.getElementById("inputEnlaceCompartir");
  input.select();
  input.setSelectionRange(0, 99999); // Mobile compatibility
  try {
      const success = document.execCommand("copy");
       if (success) {
          showMessage("📋 ¡Enlace copiado al portapapeles!");
       } else {
           throw new Error("execCommand('copy') failed");
       }
  } catch (err) {
       console.error("Error al copiar el enlace:", err);
       showMessage("❌ No se pudo copiar el enlace automáticamente. Por favor, cópialo manualmente.", "error");
  }

}

// Helper to close the share modal
function cerrarModal() {
  document.getElementById("modalCompartir").classList.add("oculto");
}

// Helper for WhatsApp sharing
function compartirWhatsapp(){
  const enlace = document.getElementById("inputEnlaceCompartir").value;
  if (!enlace) {
      showMessage("❌ No hay enlace para compartir.", "error");
      return;
  }
  const mensaje = `¡Mira esta consulta financiera que hice en Qredi! ${enlace}`;
  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

// Helper for showing temporary messages
function showMessage(text, type = "success") {
  const message = document.createElement("div");
  message.textContent = text;
  message.style.position = "fixed";
  message.style.bottom = "20px"; // Position at the bottom
  message.style.left = "50%";
  message.style.transform = "translateX(-50%)";
  message.style.background = type === "success" ? "#4caf50" : (type === "warning" ? "#ff9800" : "#f44336"); // green, orange, or red
  message.style.color = "#fff";
  message.style.padding = "1rem 1.5rem"; // Added more horizontal padding
  message.style.borderRadius = "5px";
  message.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  message.style.zIndex = "10000"; // Higher z-index
  message.style.fontWeight = "bold";
   message.style.textAlign = "center"; // Center the text
  document.body.appendChild(message);

  // Remove after 3-5 seconds
  setTimeout(() => {
    message.remove();
  }, 4000); // Increased duration slightly
}

// --- Initial setup ---
document.addEventListener('DOMContentLoaded', () => {
    // The event delegation listener on 'contenedor' handles the buttons
    // for the first section as well, so no specific listeners needed here anymore.

    // Ensure the app div is visible after auth check (or directly if no auth)
    const appDiv = document.getElementById('app');
    if (appDiv) {
        // Assumes auth-check.js modifies this or you remove auth-check
        // appDiv.style.opacity = 1;
    }
});

// Add modal event listeners when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalCompartir');
    if(modal) {
        modal.querySelector('.cerrar-modal').addEventListener('click', cerrarModal);
        modal.querySelector('.enlace-copiar button').addEventListener('click', copiarEnlace);
        // Add listeners for specific share icons if needed
        modal.querySelector('.iconos-compartir button[title="WhatsApp"]').addEventListener('click', compartirWhatsapp);
        // Add other share buttons here if you implement them (e.g., Twitter, Facebook)
    }
});