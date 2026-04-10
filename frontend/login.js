import { apiFetch, setActiveUser } from "./api.js";
import { showStatus } from "./ui.js";

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const registerStatus = document.getElementById("registerStatus");
const loginStatus = document.getElementById("loginStatus");

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
    const result = await apiFetch("/users/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showStatus(
      registerStatus,
      `Registered successfully. User ID: ${result.user.user_id}. You can login now.`,
      "success",
    );
    registerForm.reset();
  } catch (error) {
    showStatus(registerStatus, error.message, "error");
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.innerHTML = "";

  const payload = {
    email: document.getElementById("loginEmail").value.trim(),
    password: document.getElementById("loginPassword").value,
  };

  try {
    const result = await apiFetch("/users/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setActiveUser({
      user_id: result.user_id,
      name: result.name,
      email: result.email,
    });
    showStatus(loginStatus, "Login successful. Redirecting to products...", "success");
    setTimeout(() => {
      window.location.href = "products.html";
    }, 500);
  } catch (error) {
    showStatus(loginStatus, error.message, "error");
  }
});
