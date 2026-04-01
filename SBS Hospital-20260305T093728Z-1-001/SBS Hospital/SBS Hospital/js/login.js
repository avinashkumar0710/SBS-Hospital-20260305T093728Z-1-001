'use strict';

(function initLoginPage() {
  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const submitButton = document.getElementById('loginSubmit');
  const messageEl = document.getElementById('loginMessage');

  if (!form || !usernameInput || !passwordInput || !submitButton || !messageEl) return;

  function setMessage(message, isError) {
    messageEl.textContent = message;
    messageEl.classList.toggle('hidden', !message);
    messageEl.classList.toggle('is-error', Boolean(message && isError));
    messageEl.classList.toggle('is-success', Boolean(message && !isError));
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options && options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options && options.headers ? options.headers : {}),
      },
      ...options,
    });

    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }

  async function checkSession() {
    try {
      const { response, payload } = await fetchJson('/api/session');
      if (response.ok && payload.authenticated) {
        window.location.replace('/admin.html');
      }
    } catch {
      // Ignore preflight session check failures.
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      setMessage('Enter both username and password.', true);
      return;
    }

    submitButton.disabled = true;
    setMessage('Signing in...', false);

    try {
      const { response, payload } = await fetchJson('/api/session', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Login failed.');
      }

      setMessage('Login successful. Opening dashboard...', false);
      window.location.replace('/admin.html');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in.', true);
      passwordInput.focus();
      passwordInput.select();
    } finally {
      submitButton.disabled = false;
    }
  });

  checkSession();
})();
