import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import { firebaseConfig } from "./config.js";


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Sesión activa:", user.email);

    const app = document.getElementById("app");
    app.style.opacity = "1";

    const script = document.createElement("script");
    script.src = "simu.js";
    document.body.appendChild(script);
  } else {
    alert("Debes iniciar sesión para usar el simulador.");
    window.location.href = "login.html";
  }
});
