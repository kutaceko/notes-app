(function () {
  'use strict';

  // ---- State ----
  let token = localStorage.getItem('token');
  let username = localStorage.getItem('username');
  let filterImportant = false;

  // ---- DOM refs ----
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app-screen');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authError = document.getElementById('auth-error');
  const tabs = document.querySelectorAll('.tab');
  const usernameDisplay = document.getElementById('username-display');
  const noteForm = document.getElementById('note-form');
  const noteTitle = document.getElementById('note-title');
  const noteText = document.getElementById('note-text');
  const notesList = document.getElementById('notes-list');
  const btnAll = document.getElementById('btn-all');
  const btnImportant = document.getElementById('btn-important');
  const btnLogout = document.getElementById('btn-logout');
  const btnDeleteAccount = document.getElementById('btn-delete-account');
  const modalOverlay = document.getElementById('modal-overlay');
  const deleteAccountForm = document.getElementById('delete-account-form');
  const deletePassword = document.getElementById('delete-password');
  const deleteError = document.getElementById('delete-error');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');

  // ---- API helper ----
  async function api(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch('/api' + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Chyba serveru');
    return data;
  }

  // ---- Auth tabs ----
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      loginForm.classList.toggle('hidden', !isLogin);
      registerForm.classList.toggle('hidden', isLogin);
      hideError(authError);
    });
  });

  // ---- Register ----
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(authError);
    const un = document.getElementById('register-username').value.trim();
    const pw = document.getElementById('register-password').value;

    try {
      const data = await api('POST', '/auth/register', { username: un, password: pw });
      setSession(data.token, data.username);
    } catch (err) {
      showError(authError, err.message);
    }
  });

  // ---- Login ----
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(authError);
    const un = document.getElementById('login-username').value.trim();
    const pw = document.getElementById('login-password').value;

    try {
      const data = await api('POST', '/auth/login', { username: un, password: pw });
      setSession(data.token, data.username);
    } catch (err) {
      showError(authError, err.message);
    }
  });

  // ---- Logout ----
  btnLogout.addEventListener('click', () => {
    clearSession();
  });

  // ---- Create note ----
  noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = noteTitle.value.trim();
    const text = noteText.value.trim();
    if (!title || !text) return;

    try {
      await api('POST', '/notes', { title, text });
      noteTitle.value = '';
      noteText.value = '';
      loadNotes();
    } catch (err) {
      alert(err.message);
    }
  });

  // ---- Filter buttons ----
  btnAll.addEventListener('click', () => {
    filterImportant = false;
    btnAll.classList.add('active');
    btnImportant.classList.remove('active');
    loadNotes();
  });

  btnImportant.addEventListener('click', () => {
    filterImportant = true;
    btnImportant.classList.add('active');
    btnAll.classList.remove('active');
    loadNotes();
  });

  // ---- Delete account modal ----
  btnDeleteAccount.addEventListener('click', () => {
    modalOverlay.classList.remove('hidden');
    deletePassword.value = '';
    hideError(deleteError);
  });

  btnCancelDelete.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
  });

  deleteAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(deleteError);
    const pw = deletePassword.value;

    try {
      await api('DELETE', '/auth/account', { password: pw });
      modalOverlay.classList.add('hidden');
      clearSession();
    } catch (err) {
      showError(deleteError, err.message);
    }
  });

  // ---- Load notes ----
  async function loadNotes() {
    notesList.innerHTML = '<div class="loading">Načítání poznámek...</div>';
    try {
      const query = filterImportant ? '?important=true' : '';
      const notes = await api('GET', '/notes' + query);

      if (notes.length === 0) {
        notesList.innerHTML = '<div class="empty">' +
          (filterImportant ? 'Žádné důležité poznámky.' : 'Zatím nemáte žádné poznámky.') +
          '</div>';
        return;
      }

      notesList.innerHTML = notes.map(noteCardHTML).join('');
      attachNoteListeners();
    } catch (err) {
      if (err.message.includes('Přihlaste') || err.message.includes('token')) {
        clearSession();
      } else {
        notesList.innerHTML = '<div class="empty">Chyba při načítání poznámek.</div>';
      }
    }
  }

  function noteCardHTML(note) {
    const date = new Date(note.createdAt);
    const formatted = date.toLocaleString('cs-CZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const importantClass = note.important ? ' important' : '';
    const starLabel = note.important ? '⭐' : '☆';
    const safeTitle = escapeHTML(note.title);
    const safeText = escapeHTML(note.text);

    return `
      <div class="note-card${importantClass}" data-id="${note._id}">
        <div class="note-card-header">
          <h3>${safeTitle}</h3>
          <div class="note-card-actions">
            <button class="btn-icon btn-toggle-important" title="Označit jako důležité">${starLabel}</button>
            <button class="btn-icon btn-delete-note" title="Smazat poznámku">🗑️</button>
          </div>
        </div>
        <div class="note-card-text">${safeText}</div>
        <div class="note-card-date">${formatted}</div>
      </div>`;
  }

  function attachNoteListeners() {
    document.querySelectorAll('.btn-toggle-important').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.note-card');
        const id = card.dataset.id;
        try {
          await api('PATCH', '/notes/' + id + '/important');
          loadNotes();
        } catch (err) {
          alert(err.message);
        }
      });
    });

    document.querySelectorAll('.btn-delete-note').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.note-card');
        const id = card.dataset.id;
        if (!confirm('Opravdu chcete smazat tuto poznámku?')) return;
        try {
          await api('DELETE', '/notes/' + id);
          loadNotes();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  // ---- Session helpers ----
  function setSession(t, u) {
    token = t;
    username = u;
    localStorage.setItem('token', t);
    localStorage.setItem('username', u);
    showApp();
  }

  function clearSession() {
    token = null;
    username = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    showAuth();
  }

  function showApp() {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    usernameDisplay.textContent = username;
    filterImportant = false;
    btnAll.classList.add('active');
    btnImportant.classList.remove('active');
    loadNotes();
  }

  function showAuth() {
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    loginForm.reset();
    registerForm.reset();
    hideError(authError);
  }

  // ---- Utility ----
  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideError(el) {
    el.textContent = '';
    el.classList.add('hidden');
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Init ----
  if (token && username) {
    showApp();
  } else {
    showAuth();
  }
})();
