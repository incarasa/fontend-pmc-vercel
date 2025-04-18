// Variable global para el gráfico
let grafico = null;

/**
 * Genera el gráfico tipo doughnut reutilizando la misma lógica de index.js
 */
function generarGrafico(monto, interes) {
  const ctx = document.getElementById('graficoTasaCompartida').getContext('2d');
  if (grafico instanceof Chart) grafico.destroy();

  grafico = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Monto Inicial', 'Interés Calculado'],
      datasets: [{
        label: 'Distribución del Total',
        data: [parseFloat(monto), parseFloat(interes)],
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


// Función para decodificar los datos del enlace y mostrarlos
(function mostrarConsultaCompartida() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('data');

  if (!dataParam) {
    document.body.innerHTML = '<h2>No se encontró información para mostrar.</h2>';
    return;
  }

  try {
    const decoded = atob(dataParam);
    const data = JSON.parse(decoded);

    document.getElementById('mensaje').textContent = data.mensaje || "(sin mensaje)";
    document.getElementById('respuesta').textContent = data.respuesta || "(sin respuesta)";
    document.getElementById('respuestaTasa').textContent = data.tasa || "--";
    document.getElementById('respuestaInteres').textContent = data.interes || "--";
    
    const montoRaw = data.monto?.toString().replace(/[^\d.-]/g, '').replace(/\./g, '');
    const montoNumerico = parseFloat(montoRaw);

    document.getElementById('respuestaMonto').textContent = isNaN(montoNumerico)
        ? "--"
        : `${montoNumerico.toLocaleString('es-ES')} COP`;


    // Crear el gráfico si hay datos
    if (data.tasa && data.interes) {
        const monto = parseFloat(data.monto.toString().replace(/[^\d.-]/g, '').replace(/\./g, ''));
        const interes = parseFloat(data.interes.toString().replace(/[^\d.-]/g, '').replace(/\./g, ''));
        generarGrafico(monto, interes);
    }

  } catch (error) {
    document.body.innerHTML = '<h2>Error al cargar los datos. Enlace inválido.</h2>';
  }
})();
