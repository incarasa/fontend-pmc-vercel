import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Registro
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    toggleInputs(true);

    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    //Validacion basica
    if (password !== confirm) {
      showMessage("❌ Las contraseñas no coinciden.", "error");
      toggleInputs(false);
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth,email, password)
      showMessage("✅ Registro exitoso");
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
      
    } catch (error) {
      console.error("Error al registrar:", error);
      showMessage("❌ Error al registrar. ", "error");
      signupForm.reset();
      toggleInputs(false);
  }
});
}

// Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    toggleLoginInputs(true);

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password)
      showMessage("✅ Sesión iniciada con éxito");
      setTimeout(() => {
        window.location.href = "simu.html";
      }, 1000);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      showMessage("❌ Verifica tus credenciales.", "error");
      loginForm.reset();
      toggleLoginInputs(false);
    }
  });
}

function toggleInputs(disabled) {
  document.getElementById("signupEmail").disabled = disabled;
  document.getElementById("signupPassword").disabled = disabled;
  document.getElementById("confirmPassword").disabled = disabled;
}
function toggleLoginInputs(disabled) {
  document.getElementById("email").disabled = disabled;
  document.getElementById("password").disabled = disabled;
}

function showMessage(text, type = "success") {
  const message = document.createElement("div");
  message.textContent = text;
  message.style.position = "fixed";
  message.style.top = "20px";
  message.style.left = "50%";
  message.style.transform = "translateX(-50%)";
  message.style.background = type === "success" ? "#4caf50" : "#f44336"; // verde o rojo
  message.style.color = "#fff";
  message.style.padding = "1rem";
  message.style.borderRadius = "5px";
  message.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  message.style.zIndex = "9999";
  message.style.fontWeight = "bold";
  document.body.appendChild(message);

  // Quitar después de 3 segundos
  setTimeout(() => {
    message.remove();
  }, 3000);
}
