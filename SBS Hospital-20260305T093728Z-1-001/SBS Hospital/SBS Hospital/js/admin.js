'use strict';

(function initAdminDashboard() {
  const userEl = document.getElementById('adminUser');
  const statusEl = document.getElementById('adminStatus');
  const totalEl = document.getElementById('metricTotal');
  const scheduledEl = document.getElementById('metricScheduled');
  const completedEl = document.getElementById('metricCompleted');
  const noShowEl = document.getElementById('metricNoShow');
  const searchEl = document.getElementById('adminSearch');
  const refreshBtn = document.getElementById('adminRefresh');
  const logoutBtn = document.getElementById('adminLogout');
  const tbody = document.getElementById('appointmentsBody');
  const emptyEl = document.getElementById('adminEmpty');
  const filterButtons = Array.from(document.querySelectorAll('.admin-filter-chip'));

  if (!userEl || !statusEl || !totalEl || !scheduledEl || !completedEl || !noShowEl || !searchEl || !refreshBtn || !logoutBtn || !tbody || !emptyEl) {
    return;
  }

  const STATUS_LABELS = {
    scheduled: 'Scheduled',
    completed: 'Completed',
    no_show: 'No-show',
    cancelled: 'Cancelled',
  };

  const state = {
    username: '',
    appointments: [],
    filter: 'all',
    search: '',
  };

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', Boolean(isError));
  }

  function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === 'string') el.textContent = text;
    return el;
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatDateOnly(value) {
    if (!value) return '-';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function appointmentTone(dateValue) {
    if (!dateValue) return { label: 'Date not set', tone: 'muted' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointmentDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(appointmentDate.getTime())) {
      return { label: String(dateValue), tone: 'muted' };
    }

    const diffDays = Math.round((appointmentDate.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return { label: 'Today', tone: 'today' };
    if (diffDays === 1) return { label: 'Tomorrow', tone: 'upcoming' };
    if (diffDays > 1) return { label: `${diffDays} days away`, tone: 'upcoming' };
    if (diffDays === -1) return { label: 'Missed yesterday', tone: 'overdue' };
    return { label: `${Math.abs(diffDays)} days overdue`, tone: 'overdue' };
  }

  function matchesFilters(item) {
    if (state.filter !== 'all' && item.status !== state.filter) return false;
    if (!state.search) return true;

    const haystack = [
      item.id,
      item.name,
      item.phone,
      item.email,
      item.dept,
      item.date,
      item.message,
      item.status,
      item.adminNotes,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(state.search);
  }

  function updateMetrics() {
    const counts = state.appointments.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'scheduled') acc.scheduled += 1;
        if (item.status === 'completed') acc.completed += 1;
        if (item.status === 'no_show') acc.noShow += 1;
        return acc;
      },
      { total: 0, scheduled: 0, completed: 0, noShow: 0 }
    );

    totalEl.textContent = String(counts.total);
    scheduledEl.textContent = String(counts.scheduled);
    completedEl.textContent = String(counts.completed);
    noShowEl.textContent = String(counts.noShow);
  }

  function updateEmptyState(filteredCount) {
    if (filteredCount > 0) {
      emptyEl.classList.add('hidden');
      return;
    }

    const hasQuery = state.search.length > 0;
    emptyEl.textContent = hasQuery
      ? 'No appointments match the current search or status filter.'
      : 'No appointments are available yet.';
    emptyEl.classList.remove('hidden');
  }

  function buildStatusCell(item, selectEl) {
    const wrapper = createElement('div', 'admin-status-stack');
    const badge = createElement('span', `status-badge status-${item.status}`, STATUS_LABELS[item.status] || titleCase(item.status));
    const label = createElement('label', 'admin-label sr-only', 'Appointment status');
    label.htmlFor = `status-${item.id}`;

    selectEl.id = `status-${item.id}`;
    selectEl.className = 'admin-select';
    Object.keys(STATUS_LABELS).forEach((statusKey) => {
      const option = document.createElement('option');
      option.value = statusKey;
      option.textContent = STATUS_LABELS[statusKey];
      option.selected = item.status === statusKey;
      selectEl.appendChild(option);
    });

    selectEl.addEventListener('change', () => {
      badge.className = `status-badge status-${selectEl.value}`;
      badge.textContent = STATUS_LABELS[selectEl.value] || titleCase(selectEl.value);
    });

    wrapper.appendChild(badge);
    wrapper.appendChild(label);
    wrapper.appendChild(selectEl);
    return wrapper;
  }

  function createRow(item) {
    const tr = document.createElement('tr');

    const idCell = createElement('td');
    idCell.textContent = `#${item.id}`;
    tr.appendChild(idCell);

    const patientCell = createElement('td');
    const patientWrap = createElement('div', 'admin-patient');
    patientWrap.appendChild(createElement('strong', '', item.name || '-'));
    patientWrap.appendChild(createElement('span', 'admin-subtext', item.email || 'No email provided'));
    if (item.message) {
      patientWrap.appendChild(createElement('span', 'admin-note-preview', item.message));
    }
    patientCell.appendChild(patientWrap);
    tr.appendChild(patientCell);

    const contactCell = createElement('td');
    const contactWrap = createElement('div', 'admin-contact');
    const phoneLink = document.createElement('a');
    phoneLink.href = `tel:${item.phone}`;
    phoneLink.textContent = item.phone || '-';
    contactWrap.appendChild(phoneLink);
    if (item.email) {
      const emailLink = document.createElement('a');
      emailLink.href = `mailto:${item.email}`;
      emailLink.textContent = item.email;
      contactWrap.appendChild(emailLink);
    }
    contactCell.appendChild(contactWrap);
    tr.appendChild(contactCell);

    const deptCell = createElement('td');
    deptCell.textContent = titleCase(item.dept) || '-';
    tr.appendChild(deptCell);

    const appointmentCell = createElement('td');
    const appointmentWrap = createElement('div', 'admin-appointment');
    appointmentWrap.appendChild(createElement('strong', '', formatDateOnly(item.date)));
    const tone = appointmentTone(item.date);
    appointmentWrap.appendChild(createElement('span', `admin-date-flag is-${tone.tone}`, tone.label));
    appointmentCell.appendChild(appointmentWrap);
    tr.appendChild(appointmentCell);

    const submittedCell = createElement('td');
    submittedCell.textContent = formatDateTime(item.createdAt);
    tr.appendChild(submittedCell);

    const statusCell = createElement('td');
    const statusSelect = document.createElement('select');
    statusCell.appendChild(buildStatusCell(item, statusSelect));
    tr.appendChild(statusCell);

    const followUpCell = createElement('td');
    const followUpWrap = createElement('div', 'admin-row-actions');
    const notesLabel = createElement('label', 'admin-label sr-only', 'Internal notes');
    notesLabel.htmlFor = `notes-${item.id}`;

    const notes = document.createElement('textarea');
    notes.id = `notes-${item.id}`;
    notes.className = 'admin-note-input';
    notes.rows = 3;
    notes.maxLength = 1000;
    notes.placeholder = 'Add callback info, reschedule note, or staff remark';
    notes.value = item.adminNotes || '';

    const footer = createElement('div', 'admin-row-footer');
    const updatedEl = createElement('span', 'admin-updated-at', `Updated ${formatDateTime(item.updatedAt)}`);
    const saveBtn = createElement('button', 'btn btn-primary btn-sm admin-save-btn', 'Save');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => saveAppointment(item.id, statusSelect.value, notes.value, saveBtn));

    footer.appendChild(updatedEl);
    footer.appendChild(saveBtn);
    followUpWrap.appendChild(notesLabel);
    followUpWrap.appendChild(notes);
    followUpWrap.appendChild(footer);
    followUpCell.appendChild(followUpWrap);
    tr.appendChild(followUpCell);

    return tr;
  }

  function renderTable() {
    const filteredAppointments = state.appointments.filter(matchesFilters);
    tbody.replaceChildren();

    filteredAppointments.forEach((item) => {
      tbody.appendChild(createRow(item));
    });

    updateEmptyState(filteredAppointments.length);
  }

  function syncFilterButtons() {
    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === state.filter;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
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

  async function ensureSession() {
    const { response, payload } = await fetchJson('/api/session');
    if (!response.ok || !payload.authenticated) {
      window.location.replace('/login.html');
      throw new Error('Authentication required.');
    }

    state.username = payload.username || 'Admin';
    userEl.textContent = state.username;
  }

  async function loadAppointments() {
    refreshBtn.disabled = true;
    setStatus('Loading appointments...', false);

    try {
      const { response, payload } = await fetchJson('/api/admin/appointments');
      if (response.status === 401) {
        window.location.replace('/login.html');
        return;
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Failed to load appointments.');
      }

      state.appointments = Array.isArray(payload.appointments) ? payload.appointments : [];
      updateMetrics();
      renderTable();
      setStatus(`Showing ${state.appointments.length} appointment(s).`, false);
    } catch (error) {
      state.appointments = [];
      updateMetrics();
      renderTable();
      setStatus(error instanceof Error ? error.message : 'Unable to load appointments.', true);
    } finally {
      refreshBtn.disabled = false;
    }
  }

  async function saveAppointment(id, status, adminNotes, button) {
    button.disabled = true;
    button.textContent = 'Saving...';
    setStatus(`Updating appointment #${id}...`, false);

    try {
      const { response, payload } = await fetchJson(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes }),
      });

      if (response.status === 401) {
        window.location.replace('/login.html');
        return;
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Failed to save appointment.');
      }

      state.appointments = state.appointments.map((item) => (item.id === id ? payload.appointment : item));
      updateMetrics();
      renderTable();
      setStatus(`Appointment #${id} updated successfully.`, false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to save appointment.', true);
    } finally {
      button.disabled = false;
      button.textContent = 'Save';
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter || 'all';
      syncFilterButtons();
      renderTable();
    });
  });

  searchEl.addEventListener('input', (event) => {
    state.search = String(event.target.value || '').trim().toLowerCase();
    renderTable();
  });

  refreshBtn.addEventListener('click', loadAppointments);

  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    setStatus('Signing out...', false);

    try {
      await fetchJson('/api/session', { method: 'DELETE' });
    } finally {
      window.location.replace('/login.html');
    }
  });

  syncFilterButtons();

  (async () => {
    try {
      await ensureSession();
      await loadAppointments();
    } catch {
      // Redirect handled in ensureSession.
    }
  })();
})();
