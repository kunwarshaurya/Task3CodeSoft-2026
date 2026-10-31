const API_BASE = `${window.location.origin}/api/v1`;
const TOKEN_KEY = 'daylist_token';

const elements = {
  authView: document.querySelector('#auth-view'),
  dashboard: document.querySelector('#dashboard'),
  authForm: document.querySelector('#auth-form'),
  authTitle: document.querySelector('#auth-title'),
  authSubtitle: document.querySelector('#auth-subtitle'),
  authMessage: document.querySelector('#auth-message'),
  authSubmit: document.querySelector('#auth-submit'),
  authName: document.querySelector('#auth-name'),
  nameField: document.querySelector('#name-field'),
  loginTab: document.querySelector('#login-tab'),
  registerTab: document.querySelector('#register-tab'),
  userControls: document.querySelector('#user-controls'),
  userName: document.querySelector('#user-name'),
  avatar: document.querySelector('#avatar'),
  welcomeTitle: document.querySelector('#welcome-title'),
  todayLabel: document.querySelector('#today-label'),
  taskForm: document.querySelector('#task-form'),
  taskFormTitle: document.querySelector('#task-form-title'),
  taskTitle: document.querySelector('#task-title'),
  taskDescription: document.querySelector('#task-description'),
  taskCategory: document.querySelector('#task-category'),
  taskPriority: document.querySelector('#task-priority'),
  taskDueDate: document.querySelector('#task-due-date'),
  taskSubmit: document.querySelector('#task-submit'),
  cancelEdit: document.querySelector('#cancel-edit'),
  taskList: document.querySelector('#task-list'),
  loadingState: document.querySelector('#loading-state'),
  emptyState: document.querySelector('#empty-state'),
  emptyTitle: document.querySelector('#empty-title'),
  emptyDescription: document.querySelector('#empty-description'),
  emptyAction: document.querySelector('#empty-action'),
  visibleCount: document.querySelector('#visible-count'),
  totalCount: document.querySelector('#total-count'),
  progressCount: document.querySelector('#progress-count'),
  doneCount: document.querySelector('#done-count'),
  allCount: document.querySelector('#tab-all-count'),
  listMessage: document.querySelector('#list-message'),
  searchInput: document.querySelector('#search-input'),
  priorityFilter: document.querySelector('#priority-filter'),
  sortSelect: document.querySelector('#sort-select'),
};

let token = localStorage.getItem(TOKEN_KEY);
let currentUser = null;
let allTasks = [];
let authMode = 'login';
let selectedStatus = '';
let editingTaskId = null;
let searchTimer = null;
let messageTimer = null;

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Could not connect to the server. Make sure the backend is running.', 0);
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // Keep the HTTP status as the useful error when the server did not return JSON.
  }

  if (!response.ok) {
    const message = payload.error || payload.message || `Request failed (${response.status})`;
    if (response.status === 401 && token) {
      token = null;
      localStorage.removeItem(TOKEN_KEY);
    }
    throw new ApiError(message, response.status);
  }
  return payload;
}

function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === 'register';
  elements.loginTab.classList.toggle('active', !registering);
  elements.registerTab.classList.toggle('active', registering);
  elements.loginTab.setAttribute('aria-selected', String(!registering));
  elements.registerTab.setAttribute('aria-selected', String(registering));
  elements.nameField.hidden = !registering;
  elements.authName.required = registering;
  document.querySelector('#auth-password').autocomplete = registering ? 'new-password' : 'current-password';
  elements.authTitle.textContent = registering ? 'Make yourself at home' : 'Welcome back';
  elements.authSubtitle.textContent = registering ? 'Create an account to get started.' : 'Pick up where you left off.';
  elements.authSubmit.innerHTML = registering ? 'Create account <span aria-hidden="true">→</span>' : 'Sign in <span aria-hidden="true">→</span>';
  elements.authMessage.textContent = '';
  elements.authMessage.classList.remove('success');
}

function showAuth(message = '') {
  elements.dashboard.hidden = true;
  elements.userControls.hidden = true;
  elements.authView.hidden = false;
  elements.authMessage.textContent = message;
}

function showDashboard(user) {
  currentUser = user;
  elements.authView.hidden = true;
  elements.dashboard.hidden = false;
  elements.userControls.hidden = false;
  const firstName = (user.name || 'there').trim().split(/\s+/)[0];
  elements.userName.textContent = user.name || user.email;
  elements.avatar.textContent = (user.name || user.email || 'D').trim().charAt(0).toUpperCase();
  elements.welcomeTitle.textContent = `A little progress adds up, ${firstName}.`;
  elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}

function showListMessage(message, isError = true) {
  clearTimeout(messageTimer);
  elements.listMessage.textContent = message;
  elements.listMessage.classList.toggle('success', !isError);
  if (message) messageTimer = setTimeout(() => { elements.listMessage.textContent = ''; }, 4500);
}

function currentSort() {
  const [sortBy, sortOrder] = elements.sortSelect.value.split(':');
  return { sortBy, sortOrder };
}

async function loadTasks() {
  elements.loadingState.hidden = false;
  elements.emptyState.hidden = true;
  elements.listMessage.textContent = '';
  const { sortBy, sortOrder } = currentSort();
  const query = new URLSearchParams({ page: '1', limit: '100', sortBy, sortOrder });

  try {
    const payload = await request(`/tasks?${query}`);
    allTasks = payload.data?.tasks || [];
    elements.loadingState.hidden = true;
    renderTasks();
  } catch (error) {
    if (error.status === 401) {
      showAuth('Your session expired. Please sign in again.');
    } else {
      showListMessage(error.message);
      elements.loadingState.hidden = true;
      renderTasks();
    }
  } finally {
    elements.loadingState.hidden = true;
  }
}

function getVisibleTasks() {
  const needle = elements.searchInput.value.trim().toLocaleLowerCase();
  const priority = elements.priorityFilter.value;
  return allTasks.filter((task) => {
    const matchesStatus = !selectedStatus || task.status === selectedStatus;
    const matchesPriority = !priority || task.priority === priority;
    const searchableText = `${task.title || ''} ${task.description || ''} ${task.category || ''}`.toLocaleLowerCase();
    return matchesStatus && matchesPriority && (!needle || searchableText.includes(needle));
  });
}

function iconButton(label, className, svgPath) {
  const button = document.createElement('button');
  button.className = `task-action ${className || ''}`.trim();
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${svgPath}</svg>`;
  return button;
}

function makeMetaChip(text, className = '') {
  const chip = document.createElement('span');
  chip.className = `meta-chip ${className}`.trim();
  chip.textContent = text;
  return chip;
}

function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = `task-card${task.status === 'completed' ? ' is-completed' : ''}`;

  const check = document.createElement('button');
  check.type = 'button';
  check.className = 'task-check';
  check.setAttribute('aria-label', task.status === 'completed' ? 'Mark task as to do' : 'Mark task as completed');
  check.innerHTML = task.status === 'completed' ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>' : '';
  check.addEventListener('click', () => updateStatus(task, task.status === 'completed' ? 'pending' : 'completed'));

  const main = document.createElement('div');
  main.className = 'task-main';
  const title = document.createElement('h3');
  title.className = 'task-title';
  title.textContent = task.title;
  main.append(title);

  if (task.description) {
    const description = document.createElement('p');
    description.className = 'task-description';
    description.textContent = task.description;
    main.append(description);
  }

  const meta = document.createElement('div');
  meta.className = 'task-meta';
  if (task.category && task.category !== 'general') meta.append(makeMetaChip(task.category));
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);
    const difference = Math.round((dueDay - today) / 86400000);
    const dueClass = task.status !== 'completed' && difference < 0 ? 'overdue' : task.status !== 'completed' && difference <= 1 ? 'due-soon' : '';
    const label = `Due ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(due)}`;
    meta.append(makeMetaChip(label, dueClass));
  }
  const priority = document.createElement('span');
  priority.className = `priority-tag priority-${task.priority || 'medium'}`;
  priority.textContent = task.priority || 'medium';
  meta.append(priority);
  main.append(meta);

  const side = document.createElement('div');
  side.className = 'task-side';
  const status = document.createElement('select');
  status.className = 'task-status';
  status.setAttribute('aria-label', `Status for ${task.title}`);
  for (const [value, label] of [['pending', 'To do'], ['in-progress', 'In progress'], ['completed', 'Done']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = task.status === value;
    status.append(option);
  }
  status.addEventListener('change', () => updateStatus(task, status.value));

  const edit = iconButton('Edit task', '', '<path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" />');
  edit.addEventListener('click', () => beginEdit(task));
  const remove = iconButton('Delete task', 'delete', '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />');
  remove.addEventListener('click', () => deleteTask(task));
  side.append(status, edit, remove);
  card.append(check, main, side);
  return card;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  elements.taskList.replaceChildren(...visibleTasks.map(createTaskCard));
  elements.visibleCount.textContent = String(visibleTasks.length);
  elements.totalCount.textContent = String(allTasks.length);
  elements.progressCount.textContent = String(allTasks.filter((task) => task.status === 'in-progress').length);
  elements.doneCount.textContent = String(allTasks.filter((task) => task.status === 'completed').length);
  elements.allCount.textContent = String(allTasks.length);

  const hasTasks = visibleTasks.length > 0;
  elements.emptyState.hidden = hasTasks || elements.loadingState.hidden === false;
  if (!hasTasks) {
    const filtered = Boolean(selectedStatus || elements.priorityFilter.value || elements.searchInput.value.trim());
    elements.emptyTitle.textContent = filtered ? 'Nothing here just yet.' : 'A fresh page.';
    elements.emptyDescription.textContent = filtered ? 'Try changing your search or filters.' : 'Add your first task and make today count.';
    elements.emptyAction.hidden = filtered;
  }
}

function setStatusTab(status) {
  selectedStatus = status;
  document.querySelectorAll('.status-tab').forEach((button) => {
    const active = button.dataset.status === status;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  renderTasks();
}

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function beginEdit(task) {
  editingTaskId = task._id;
  elements.taskFormTitle.textContent = 'Edit task';
  elements.taskTitle.value = task.title || '';
  elements.taskDescription.value = task.description || '';
  elements.taskCategory.value = task.category === 'general' ? '' : task.category || '';
  elements.taskPriority.value = task.priority || 'medium';
  elements.taskDueDate.value = toDateInputValue(task.dueDate);
  elements.taskSubmit.innerHTML = 'Save changes <span aria-hidden="true">↗</span>';
  elements.cancelEdit.hidden = false;
  document.querySelector('#task-title').focus();
  document.querySelector('.composer-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetTaskForm() {
  editingTaskId = null;
  elements.taskForm.reset();
  elements.taskPriority.value = 'medium';
  elements.taskFormTitle.textContent = 'Add a task';
  elements.taskSubmit.innerHTML = 'Add to my list <span aria-hidden="true">↗</span>';
  elements.cancelEdit.hidden = true;
}

function dueDatePayload() {
  const value = elements.taskDueDate.value;
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

async function submitTask(event) {
  event.preventDefault();
  const button = elements.taskSubmit;
  button.disabled = true;
  const originalMarkup = button.innerHTML;
  button.textContent = editingTaskId ? 'Saving...' : 'Adding...';
  const body = {
    title: elements.taskTitle.value.trim(),
    description: elements.taskDescription.value.trim(),
    category: elements.taskCategory.value.trim() || 'general',
    priority: elements.taskPriority.value,
    dueDate: dueDatePayload(),
  };

  try {
    if (editingTaskId) {
      const currentTask = allTasks.find((task) => task._id === editingTaskId);
      body.status = currentTask?.status || 'pending';
      await request(`/tasks/${editingTaskId}`, { method: 'PATCH', body: JSON.stringify(body) });
      showListMessage('Task updated.', false);
    } else {
      await request('/tasks', { method: 'POST', body: JSON.stringify(body) });
      showListMessage('Task added to your list.', false);
    }
    resetTaskForm();
    await loadTasks();
  } catch (error) {
    if (error.status === 401) showAuth('Your session expired. Please sign in again.');
    else showListMessage(error.message);
  } finally {
    button.disabled = false;
    if (editingTaskId) button.innerHTML = 'Save changes <span aria-hidden="true">↗</span>';
    else if (button.textContent === 'Adding...' || button.textContent === 'Saving...') button.innerHTML = originalMarkup;
  }
}

async function updateStatus(task, status) {
  try {
    await request(`/tasks/${task._id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadTasks();
  } catch (error) {
    if (error.status === 401) showAuth('Your session expired. Please sign in again.');
    else showListMessage(error.message);
  }
}

async function deleteTask(task) {
  if (!window.confirm(`Delete “${task.title}”?`)) return;
  try {
    await request(`/tasks/${task._id}`, { method: 'DELETE' });
    if (editingTaskId === task._id) resetTaskForm();
    showListMessage('Task deleted.', false);
    await loadTasks();
  } catch (error) {
    if (error.status === 401) showAuth('Your session expired. Please sign in again.');
    else showListMessage(error.message);
  }
}

async function submitAuth(event) {
  event.preventDefault();
  elements.authMessage.textContent = '';
  elements.authMessage.classList.remove('success');
  elements.authSubmit.disabled = true;
  elements.authSubmit.textContent = authMode === 'register' ? 'Creating account...' : 'Signing in...';
  const body = {
    email: document.querySelector('#auth-email').value.trim(),
    password: document.querySelector('#auth-password').value,
  };
  if (authMode === 'register') body.name = elements.authName.value.trim();

  try {
    const payload = await request(`/auth/${authMode}`, { method: 'POST', body: JSON.stringify(body) });
    token = payload.data.token;
    localStorage.setItem(TOKEN_KEY, token);
    showDashboard(payload.data.user);
    await loadTasks();
  } catch (error) {
    elements.authMessage.textContent = error.message;
  } finally {
    elements.authSubmit.disabled = false;
    elements.authSubmit.innerHTML = authMode === 'register' ? 'Create account <span aria-hidden="true">→</span>' : 'Sign in <span aria-hidden="true">→</span>';
  }
}

async function signOut() {
  token = null;
  currentUser = null;
  allTasks = [];
  localStorage.removeItem(TOKEN_KEY);
  resetTaskForm();
  elements.searchInput.value = '';
  elements.priorityFilter.value = '';
  setStatusTab('');
  setAuthMode('login');
  showAuth();
}

async function start() {
  elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  elements.loginTab.addEventListener('click', () => setAuthMode('login'));
  elements.registerTab.addEventListener('click', () => setAuthMode('register'));
  elements.authForm.addEventListener('submit', submitAuth);
  elements.taskForm.addEventListener('submit', submitTask);
  elements.cancelEdit.addEventListener('click', resetTaskForm);
  elements.emptyAction.addEventListener('click', () => document.querySelector('#task-title').focus());
  document.querySelector('#logout-button').addEventListener('click', signOut);
  document.querySelectorAll('.status-tab').forEach((button) => button.addEventListener('click', () => setStatusTab(button.dataset.status)));
  elements.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderTasks, 120);
  });
  elements.priorityFilter.addEventListener('change', renderTasks);
  elements.sortSelect.addEventListener('change', loadTasks);
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !elements.dashboard.hidden) {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });

  setAuthMode('login');
  if (!token) {
    showAuth();
    return;
  }

  try {
    const payload = await request('/auth/me');
    showDashboard(payload.data.user);
    await loadTasks();
  } catch (error) {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
    showAuth(error.status === 401 ? 'Your session expired. Please sign in again.' : error.message);
  }
}

start();
