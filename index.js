let historialConversacion = ""; // Acumula el texto completo de la conversación

document.getElementById("enviarBtn").addEventListener("click", async () => {
  const nuevaEntrada = document.getElementById("mensaje").value;
  if (!nuevaEntrada.trim()) return; // No hacer nada si está vacío

  // Añadir entrada del usuario al historial
  historialConversacion += (historialConversacion ? " " : "") + nuevaEntrada;

  try {
    const res = await fetch("http://localhost:3000/chatGPT", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ texto_usuario: historialConversacion })
    });

    const data = await res.json();

    if (data.faltantes) {
      // Backend pide más información: mostrar la pregunta
      document.getElementById("respuesta").textContent = data.pregunta;
    } else {
      // Backend respondió con JSON completo: mostrarlo formateado
      document.getElementById("respuesta").textContent = JSON.stringify(data, null, 2);
      historialConversacion = ""; // Reiniciar la conversación
    }

    document.getElementById("mensaje").value = ""; // Limpiar input del usuario
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("respuesta").textContent = "Error al procesar la solicitud.";
  }
});
