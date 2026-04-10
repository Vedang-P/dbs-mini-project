import { apiFetch } from "./api.js";
import { showStatus } from "./ui.js";

const registerForm = document.getElementById("registerForm");
const registerStatus = document.getElementById("registerStatus");

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerStatus.innerHTML = "";

  const payload = {
    name: document.getElementById("regName").value.trim(),
    email: document.getElementById("regEmail").value.trim(),
    password: document.getElementById("regPassword").value,
    phone: document.getElementById("regPhone").value.trim() || null,
  };

  try {
    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showStatus(registerStatus, "Account created. Redirecting to login...", "success");
    registerForm.reset();
    setTimeout(() => {
      window.location.href = "login.html";
    }, 700);
  } catch (error) {
    showStatus(registerStatus, error.message, "error");
  }
});
