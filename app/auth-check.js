import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAu-1qgHL7sSr3YErtFSWLTTFZLP1CiC0s",
    authDomain: "qredi-auth.firebaseapp.com",
    projectId: "qredi-auth",
    storageBucket: "qredi-auth.firebasestorage.app",
    messagingSenderId: "204030499494",
    appId: "1:204030499494:web:1a63a5610596bfa4e53267",
    measurementId: "G-QTCRLL8N1M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Espera confirmación de sesión
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Sesión activa:", user.email);

    const loader = document.getElementById("loader")
    if (loader) loader.remove();

    const app = document.getElementById("app");
    app.style.opacity = "1";

    
    const script = document.createElement("script");
    script.src = "index.js";
    document.body.appendChild(script);

    
  } else {
    alert("Debes iniciar sesión para usar el simulador.");
    window.location.href = "login.html";
  }
});