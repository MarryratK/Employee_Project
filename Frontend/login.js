'use strict';

const BASE_URL = 'http://localhost:3333';
const TOKEN_KEY = 'cambodiahr-token';

/* ── Redirect if already logged in ── */
(function checkAlreadyLoggedIn() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (Date.now() < payload.exp * 1000) {
      window.location.replace('index.html');
    }
  } catch {
    localStorage.removeItem(TOKEN_KEY);
  }
})();

/* ── Theme ── */
function initTheme() {
  const saved = localStorage.getItem('cambodiahr-theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('cambodiahr-theme', t);
  const moon = document.querySelector('.icon-moon');
  const sun  = document.querySelector('.icon-sun');
  if (moon) moon.style.display = t === 'dark' ? 'block' : 'none';
  if (sun)  sun.style.display  = t === 'light' ? 'block' : 'none';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ── Password toggle ── */
document.getElementById('togglePassword').addEventListener('click', () => {
  const input  = document.getElementById('password');
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  document.getElementById('eyeOpen').style.display   = isText ? 'block' : 'none';
  document.getElementById('eyeClosed').style.display = isText ? 'none'  : 'block';
});

/* ── Validation ── */
function validate() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errU = document.getElementById('errUsername');
  const errP = document.getElementById('errPassword');

  let valid = true;

  if (!username) {
    errU.classList.remove('hidden');
    document.getElementById('username').style.borderColor = 'var(--rose)';
    valid = false;
  } else {
    errU.classList.add('hidden');
    document.getElementById('username').style.borderColor = '';
  }

  if (!password) {
    errP.classList.remove('hidden');
    document.getElementById('password').style.borderColor = 'var(--rose)';
    valid = false;
  } else {
    errP.classList.add('hidden');
    document.getElementById('password').style.borderColor = '';
  }

  return valid;
}

/* ── Show / hide error banner ── */
function showError(msg) {
  const banner = document.getElementById('loginError');
  document.getElementById('loginErrorMsg').textContent = msg;
  banner.classList.remove('hidden');
  // re-trigger shake animation
  banner.style.animation = 'none';
  banner.offsetHeight; // reflow
  banner.style.animation = '';
}

function hideError() {
  document.getElementById('loginError').classList.add('hidden');
}

/* ── Form submit ── */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  if (!validate()) return;

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('loginBtn');
  const btnText  = document.getElementById('loginBtnText');
  const spinner  = document.getElementById('loginSpinner');

  btn.disabled = true;
  btnText.textContent = 'Signing in…';
  spinner.classList.remove('hidden');

  try {
    const res  = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(data.message || 'Invalid username or password');
      return;
    }

    if (!data.token) {
      showError('Login failed — no token received');
      return;
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    window.location.replace('index.html');

  } catch {
    showError('Cannot reach server. Make sure the backend is running.');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Sign In';
    spinner.classList.add('hidden');
  }
});

/* ── Clear field errors on input ── */
document.getElementById('username').addEventListener('input', () => {
  document.getElementById('errUsername').classList.add('hidden');
  document.getElementById('username').style.borderColor = '';
});
document.getElementById('password').addEventListener('input', () => {
  document.getElementById('errPassword').classList.add('hidden');
  document.getElementById('password').style.borderColor = '';
});

initTheme();
