import { apiFetch, getAuthSession, setAuthSession } from "./api.js";
import { showStatus } from "./ui.js";

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

const existingSession = getAuthSession();
if (existingSession?.access_token && existingSession?.user?.user_id) {
  window.location.href = "products.html";
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.innerHTML = "";

  const payload = {
    email: document.getElementById("loginEmail").value.trim(),
    password: document.getElementById("loginPassword").value,
  };

  try {
    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setAuthSession({
      access_token: result.access_token,
      expires_at: result.expires_at,
      user: {
        user_id: result.user.user_id,
        name: result.user.name,
        email: result.user.email,
        is_admin: result.user.is_admin,
      },
    });
    showStatus(loginStatus, "Login successful. Redirecting to products...", "success");
    setTimeout(() => {
      window.location.href = "products.html";
    }, 500);
  } catch (error) {
    showStatus(loginStatus, error.message, "error");
  }
});
