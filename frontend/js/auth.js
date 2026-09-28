const LOGIN_URL = "../backend/auth/login.php";
const FORGOT_URL = "../backend/auth/forgot_password.php";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginNotice = document.getElementById("loginNotice");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberEmail = document.getElementById("rememberEmail");

const forgotModal = document.getElementById("forgotModal");
const forgotOpen = document.getElementById("forgotOpen");
const forgotClose = document.getElementById("forgotClose");
const forgotForm = document.getElementById("forgotForm");
const forgotButton = document.getElementById("forgotButton");
const forgotNotice = document.getElementById("forgotNotice");
const resetLinkBox = document.getElementById("resetLinkBox");

const savedEmail = localStorage.getItem("campusCoinEmail");
if (savedEmail) {
  emailInput.value = savedEmail;
  rememberEmail.checked = true;
}

function showNotice(element, message, type = "error") {
  element.textContent = message;
  element.className = `notice show ${type}`;
}

function clearNotice(element) {
  element.textContent = "";
  element.className = "notice";
}

function setLoading(button, loading, text) {
  if (loading) {
    button.disabled = true;
    button.dataset.label = button.innerHTML;
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${text}</span>`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.label || text;
  }
}

document.getElementById("togglePassword").addEventListener("click", () => {
  const showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  document.getElementById("togglePassword").setAttribute(
    "aria-label",
    showing ? "Show password" : "Hide password"
  );
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearNotice(loginNotice);

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showNotice(loginNotice, "Please enter your email and password.");
    return;
  }

  setLoading(loginButton, true, "Signing in...");

  try {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!data.success) {
      showNotice(loginNotice, data.message || "Login failed.");
      return;
    }

    if (rememberEmail.checked) {
      localStorage.setItem("campusCoinEmail", email);
    } else {
      localStorage.removeItem("campusCoinEmail");
    }

    showNotice(loginNotice, "Login successful. Opening your dashboard...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 650);
  } catch (error) {
    showNotice(loginNotice, "Could not connect to the server. Check Apache/MySQL and try again.");
  } finally {
    setLoading(loginButton, false, "Log in to Campus Coin");
  }
});

function openForgotModal() {
  forgotModal.classList.add("open");
  forgotModal.setAttribute("aria-hidden", "false");
  document.getElementById("resetEmail").value = emailInput.value.trim();
  setTimeout(() => document.getElementById("resetEmail").focus(), 80);
}

function closeForgotModal() {
  forgotModal.classList.remove("open");
  forgotModal.setAttribute("aria-hidden", "true");
  clearNotice(forgotNotice);
  resetLinkBox.classList.add("hidden");
  resetLinkBox.textContent = "";
}

forgotOpen.addEventListener("click", openForgotModal);
forgotClose.addEventListener("click", closeForgotModal);

forgotModal.addEventListener("click", (event) => {
  if (event.target === forgotModal) closeForgotModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeForgotModal();
});

forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearNotice(forgotNotice);

  const email = document.getElementById("resetEmail").value.trim();
  if (!email) {
    showNotice(forgotNotice, "Please enter your registered email.");
    return;
  }

  setLoading(forgotButton, true, "Generating...");

  try {
    const response = await fetch(FORGOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!data.success) {
      showNotice(forgotNotice, data.message || "Could not create reset link.");
      return;
    }

    showNotice(forgotNotice, data.message || "Reset request created.", "success");

    if (data.reset_link) {
      resetLinkBox.innerHTML = `
        <strong>Local testing link:</strong><br>
        <a class="text-link" href="${data.reset_link}">${data.reset_link}</a>
      `;
      resetLinkBox.classList.remove("hidden");
    }
  } catch (error) {
    showNotice(forgotNotice, "Could not connect to the server.");
  } finally {
    setLoading(forgotButton, false, "Generate reset link");
  }
});
