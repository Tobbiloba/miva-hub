/**
 * Askly Capture — Options Page Script
 * Handles login, logout, and API URL configuration.
 */

const loginCard = document.getElementById("loginCard");
const loggedInCard = document.getElementById("loggedInCard");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const loginSuccess = document.getElementById("loginSuccess");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userAvatar = document.getElementById("userAvatar");
const apiUrlInput = document.getElementById("apiUrl");
const saveApiBtn = document.getElementById("saveApiBtn");
const apiSuccess = document.getElementById("apiSuccess");

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, resolve);
  });
}

// ── Initialize ──────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Load API URL
  const { askly_api_url } = await chrome.storage.local.get("askly_api_url");
  apiUrlInput.value = askly_api_url || "";

  // Check login state
  const sessionRes = await sendMessage({ type: "GET_SESSION" });
  if (sessionRes?.ok && sessionRes.data?.token) {
    showLoggedIn(sessionRes.data.user);
  } else {
    showLoginForm();
  }
});

// ── Login ───────────────────────────────────────────────────────

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showLoginError("Email and password are required");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";
  loginError.style.display = "none";

  const result = await sendMessage({ type: "LOGIN", email, password });

  loginBtn.disabled = false;
  loginBtn.textContent = "Login";

  if (result?.ok) {
    loginSuccess.textContent = "Logged in successfully!";
    loginSuccess.style.display = "block";
    setTimeout(() => {
      showLoggedIn(result.data.user);
    }, 500);
  } else {
    showLoginError(result?.error || "Login failed");
  }
});

// Enter key triggers login
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

// ── Logout ──────────────────────────────────────────────────────

logoutBtn.addEventListener("click", async () => {
  await sendMessage({ type: "LOGOUT" });
  showLoginForm();
});

// ── API URL ─────────────────────────────────────────────────────

saveApiBtn.addEventListener("click", async () => {
  const url = apiUrlInput.value.trim();
  // Remove trailing slash
  const cleanUrl = url.replace(/\/+$/, "");
  await chrome.storage.local.set({ askly_api_url: cleanUrl || null });
  apiSuccess.textContent = cleanUrl
    ? `API URL set to ${cleanUrl}`
    : "Reset to default (production)";
  apiSuccess.style.display = "block";
  setTimeout(() => {
    apiSuccess.style.display = "none";
  }, 3000);
});

// ── UI helpers ──────────────────────────────────────────────────

function showLoginForm() {
  loginCard.style.display = "block";
  loggedInCard.style.display = "none";
  loginSuccess.style.display = "none";
  loginError.style.display = "none";
}

function showLoggedIn(user) {
  loginCard.style.display = "none";
  loggedInCard.style.display = "block";

  const name = user?.name || "Unknown";
  userName.textContent = name;
  userEmail.textContent = user?.email || "—";
  userAvatar.textContent = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.style.display = "block";
}
