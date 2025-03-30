/**
 * Calcula el interés total a pagar con tasa efectiva anual compuesta.
 * 
 * @param {number} montoInicial - Monto prestado o invertido.
 * @param {number} tea - Tasa efectiva anual en porcentaje (ej. 42.58).
 * @param {number} plazoDias - Plazo en días.
 * @returns {number} Interés total a pagar.
 */
function calcularInteresTotal(montoInicial, tea, plazoDias) {
    const tasaDecimal = tea / 100;
    const factorTiempo = plazoDias / 365;
    const interesTotal = montoInicial * (Math.pow(1 + tasaDecimal, factorTiempo) - 1);
    return interesTotal;
  }
  
  // 🔢 Tus parámetros
  const montoInicial = 2000000;   // 2 millones
  const tasaEfectivaAnual = 42.58; // 42.58%
  const plazoEnDias = 1095;       // 1095 días (3 años)
  
  // 🧮 Cálculo del interés
  const interesTotal = calcularInteresTotal(montoInicial, tasaEfectivaAnual, plazoEnDias);
  
  // 💬 Resultado
  console.log("Interés total a pagar:", interesTotal.toFixed(2));
  