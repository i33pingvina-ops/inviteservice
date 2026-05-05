// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentInvitationId = null;

// ==================== ДАННЫЕ ШАБЛОНОВ ====================
const templates = {
  wedding: [
    { id: 'wedding1', name: 'Классическая свадьба', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400', bgImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600' },
    { id: 'wedding2', name: 'Романтическая свадьба', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400', bgImage: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600' },
  ],
  birthday: [
    { id: 'birthday1', name: 'Детский праздник', image: 'https://images.unsplash.com/photo-1464349153735-7db50ed83c5c?w=400', bgImage: 'https://images.unsplash.com/photo-1576411592141-29d7232a046c?w=600' },
    { id: 'birthday2', name: 'Юбилей', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400', bgImage: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600' },
  ],
  genderparty: [
    { id: 'gender1', name: 'Gender Reveal', image: 'https://images.unsplash.com/photo-1610962286282-f2c9b3cfbe17?w=400', bgImage: 'https://images.unsplash.com/photo-1610962286282-f2c9b3cfbe17?w=600' },
  ],
  anniversary: [
    { id: 'anniversary1', name: 'Золотая свадьба', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400', bgImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600' },
  ],
};

// ==================== API ФУНКЦИИ ====================
const API = {
  async fetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API error');
    }
    return response.json();
  },
};

// ==================== АВТОРИЗАЦИЯ ====================
async function showLoginModal() {
  // Удаляем старый модал, если есть
  const oldModal = document.getElementById('authModal');
  if (oldModal) oldModal.remove();
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'authModal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Вход / Регистрация</h2>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="loginEmail" placeholder="email@example.com">
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input type="password" id="loginPassword" placeholder="пароль">
      </div>
      <button onclick="window.login()">Войти</button>
      <button onclick="window.register()" class="btn-secondary">Зарегистрироваться</button>
      <button onclick="window.closeModal()" style="background: #999;">Отмена</button>
    </div>
  `;
  document.body.appendChild(modal);
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const data = await API.fetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    closeModal();
    location.reload();
  } catch(e) {
    alert('Ошибка входа: ' + e.message);
  }
}

async function register() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    await API.fetch('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await login();
  } catch(e) {
    alert('Ошибка регистрации: ' + e.message);
  }
}

function closeModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.remove();
}

function logout() {
  localStorage.removeItem('token');
  location.href = '/index.html';
}

// ==================== ГЛАВНАЯ СТРАНИЦА ====================
async function renderMainPage() {
  const token = localStorage.getItem('token');
  const navButtons = document.getElementById('navButtons');
  if (navButtons) {
    if (token) {
      navButtons.innerHTML = `
        <button onclick="location.href='/dashboard.html'">Мои приглашения</button>
        <button onclick="logout()" class="btn-secondary">Выйти</button>
      `;
    } else {
      navButtons.innerHTML = `<button onclick="showLoginModal()">Войти</button>`;
    }
  }

  // Если есть контент для главной страницы, заполняем его
  const contentDiv = document.getElementById('content');
  if (contentDiv) {
    const events = [
      { id: 'wedding', name: 'Свадьба', icon: '💒' },
      { id: 'birthday', name: 'День рождения', icon: '🎂' },
      { id: 'genderparty', name: 'Gender Party', icon: '🎀' },
      { id: 'anniversary', name: 'Юбилей', icon: '🎉' },
    ];

    let html = '<h2>🎯 Выберите тип мероприятия</h2><div class="events-grid">';
    events.forEach(event => {
      html += `
        <div class="card" onclick="selectEvent('${event.id}')">
          <div class="card-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 80px;">
            ${event.icon}
          </div>
          <div class="card-content">
            <div class="card-title">${event.name}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    contentDiv.innerHTML = html;
  }
}

async function selectEvent(eventType) {
  const tmpls = templates[eventType] || templates.wedding;
  
  let html = '<h2>🎨 Выберите шаблон</h2><div class="templates-grid">';
  tmpls.forEach(tmpl => {
    html += `
      <div class="card" onclick="selectTemplate('${eventType}', '${tmpl.id}')">
        <div class="card-image" style="background-image: url('${tmpl.image}');"></div>
        <div class="card-content">
          <div class="card-title">${tmpl.name}</div>
        </div>
      </div>
    `;
  });
  html += '</div><button onclick="renderMainPage()" class="btn-secondary">← Назад</button>';
  document.getElementById('content').innerHTML = html;
}

// ==================== ВЫБОР ШАБЛОНА (общий) ====================
async function selectTemplate(eventType, templateId) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Пожалуйста, войдите или зарегистрируйтесь');
    showLoginModal();
    return;
  }

  try {
    const invitation = await API.fetch('/invitations', {
      method: 'POST',
      body: JSON.stringify({ eventType, templateId }),
    });
    location.href = `/editor.html?id=${invitation.id}`;
  } catch(e) {
    alert('Ошибка: ' + e.message);
  }
}

// ==================== РЕДАКТОР ====================
async function loadEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  if (!id) return;
  
  currentInvitationId = id;
  
  try {
    const invitation = await API.fetch(`/invitations/${id}`, {
      method: 'GET',
    });
    
    const titleInput = document.getElementById('eventTitle');
    const descInput = document.getElementById('eventDescription');
    const dateInput = document.getElementById('eventDate');
    const locationInput = document.getElementById('eventLocation');
    const questionsInput = document.getElementById('customQuestions');
    
    if (titleInput) titleInput.value = invitation.title || '';
    if (descInput) descInput.value = invitation.description || '';
    if (dateInput) dateInput.value = invitation.eventDate || '';
    if (locationInput) locationInput.value = invitation.eventLocation || '';
    if (questionsInput) questionsInput.value = (invitation.customQuestions || []).join(', ');
    
    updatePreview();
    
    const fields = ['eventTitle', 'eventDescription', 'eventDate', 'eventLocation', 'customQuestions'];
    fields.forEach(field => {
      const el = document.getElementById(field);
      if (el) el.addEventListener('input', updatePreview);
    });
    
  } catch(e) {
    alert('Ошибка загрузки: ' + e.message);
  }
}

function updatePreview() {
  const title = document.getElementById('eventTitle')?.value || 'Название события';
  const desc = document.getElementById('eventDescription')?.value || 'Описание мероприятия';
  const date = document.getElementById('eventDate')?.value || 'Дата будет объявлена';
  const location = document.getElementById('eventLocation')?.value || 'Место проведения';
  const questions = document.getElementById('customQuestions')?.value || '';
  
  const previewTitle = document.getElementById('previewTitle');
  const previewDesc = document.getElementById('previewDesc');
  const previewDate = document.getElementById('previewDate');
  const previewLocation = document.getElementById('previewLocation');
  const previewQuestions = document.getElementById('previewQuestions');
  
  if (previewTitle) previewTitle.textContent = title;
  if (previewDesc) previewDesc.textContent = desc;
  if (previewDate) previewDate.innerHTML = `📅 ${date}`;
  if (previewLocation) previewLocation.innerHTML = `📍 ${location}`;
  
  if (previewQuestions) {
    if (questions && questions.trim()) {
      const qList = questions.split(',').map(q => q.trim()).filter(q => q);
      if (qList.length > 0) {
        previewQuestions.innerHTML = '<h4>❓ Вопросы для гостей:</h4><ul>' + qList.map(q => `<li>${q}</li>`).join('') + '</ul>';
        previewQuestions.style.display = 'block';
      } else {
        previewQuestions.style.display = 'none';
      }
    } else {
      previewQuestions.style.display = 'none';
    }
  }
}

async function saveInvitation() {
  const data = {
    title: document.getElementById('eventTitle')?.value || '',
    description: document.getElementById('eventDescription')?.value || '',
    eventDate: document.getElementById('eventDate')?.value || '',
    eventLocation: document.getElementById('eventLocation')?.value || '',
    customQuestions: (document.getElementById('customQuestions')?.value || '').split(',').map(q => q.trim()).filter(q => q),
  };
  
  await API.fetch(`/invitations/${currentInvitationId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  
  alert('✅ Сохранено!');
}

async function payAndPublish() {
  try {
    await API.fetch('/create-payment', {
      method: 'POST',
      body: JSON.stringify({ invitationId: currentInvitationId })
    });
    
    await API.fetch(`/publish/${currentInvitationId}`, { method: 'POST' });
    alert('🎉 Приглашение опубликовано! (демо-режим)');
    location.href = '/dashboard.html';
  } catch(e) {
    alert('Ошибка: ' + e.message);
  }
}

// ==================== ДАШБОРД ====================
async function loadDashboard() {
  const token = localStorage.getItem('token');
  if (!token) {
    location.href = '/index.html';
    return;
  }
  
  try {
    const invitationsList = await API.fetch('/user/invitations', { method: 'GET' });
    const contentDiv = document.getElementById('content');
    
    if (!contentDiv) return;
    
    if (invitationsList.length === 0) {
      contentDiv.innerHTML = `
        <h2>📭 У вас пока нет приглашений</h2>
        <button onclick="location.href='/index.html'">➕ Создать первое приглашение</button>
      `;
      return;
    }
    
    let html = '<h2>📋 Мои приглашения</h2><div class="templates-grid">';
    invitationsList.forEach(inv => {
      html += `
        <div class="card">
          <div class="card-content">
            <div class="card-title">${inv.title || 'Без названия'}</div>
            <p>🎉 ${inv.eventType}</p>
            <p>Статус: ${inv.isPublished ? '✅ Опубликовано' : '📝 Черновик'}</p>
            ${inv.isPublished ? `<p>🔗 <a href="/invite/${inv.uniqueLink}" target="_blank">Ссылка для гостей</a></p>` : ''}
            <button onclick="editInvitation('${inv.id}')">✏️ Редактировать</button>
            ${inv.isPublished ? `<button onclick="viewResponses('${inv.id}')" class="btn-secondary">📊 Ответы гостей</button>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
    contentDiv.innerHTML = html;
  } catch(e) {
    alert('Ошибка загрузки: ' + e.message);
  }
}

function editInvitation(id) {
  location.href = `/editor.html?id=${id}`;
}

async function viewResponses(invitationId) {
  const contentDiv = document.getElementById('content');
  if (!contentDiv) return;
  
  try {
    const responses = await API.fetch(`/responses/${invitationId}`, { method: 'GET' });
    
    if (responses.length === 0) {
      contentDiv.innerHTML = `
        <h2>📊 Ответы гостей</h2>
        <p>Пока никто не ответил на приглашение</p>
        <button onclick="loadDashboard()" class="btn-secondary">← Назад</button>
      `;
      return;
    }
    
    let html = '<h2>📊 Ответы гостей</h2><div class="templates-grid">';
    responses.forEach(r => {
      html += `
        <div class="card">
          <div class="card-content">
            <p><strong>👤 ${r.guestName}</strong> (${r.guestEmail || 'email не указан'})</p>
            <p>${r.willAttend ? '✅ Придёт' : '❌ Не придёт'}</p>
            ${r.answers && r.answers.length ? `<p>📝 Ответы: ${r.answers.join(', ')}</p>` : ''}
            <small>📅 ${new Date(r.submittedAt).toLocaleString()}</small>
          </div>
        </div>
      `;
    });
    html += '<button onclick="loadDashboard()" class="btn-secondary">← Назад</button>';
    contentDiv.innerHTML = html;
  } catch(e) {
    alert('Ошибка загрузки ответов: ' + e.message);
  }
}

// ==================== НОВЫЕ ФУНКЦИИ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ ====================
function scrollToTemplates() {
  const templatesSection = document.getElementById('templates');
  if (templatesSection) {
    templatesSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function navigateToEventSelection() {
  location.href = '/index.html';
}

function selectEventType(type) {
  location.href = '/index.html';
}

async function selectTemplateFromCatalog(eventType, templateId) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Пожалуйста, войдите или зарегистрируйтесь');
    showLoginModal();
    return;
  }

  try {
    const invitation = await API.fetch('/invitations', {
      method: 'POST',
      body: JSON.stringify({ eventType, templateId }),
    });
    location.href = `/editor.html?id=${invitation.id}`;
  } catch(e) {
    alert('Ошибка: ' + e.message);
  }
}

// ==================== ЭКСПОРТ В ГЛОБАЛЬНЫЙ ОБЪЕКТ window ====================
window.login = login;
window.register = register;
window.closeModal = closeModal;
window.logout = logout;
window.selectEvent = selectEvent;
window.selectTemplate = selectTemplate;
window.saveInvitation = saveInvitation;
window.payAndPublish = payAndPublish;
window.editInvitation = editInvitation;
window.viewResponses = viewResponses;
window.renderMainPage = renderMainPage;
window.loadEditor = loadEditor;
window.loadDashboard = loadDashboard;
window.showLoginModal = showLoginModal;
window.updatePreview = updatePreview;

// Новые функции для главной страницы
window.scrollToTemplates = scrollToTemplates;
window.navigateToEventSelection = navigateToEventSelection;
window.selectEventType = selectEventType;
window.selectTemplateFromCatalog = selectTemplateFromCatalog;