const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Создаём папку для загрузок если её нет
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
app.use('/uploads', express.static('uploads'));

const upload = multer({ dest: 'uploads/' });

// ========== ХРАНЕНИЕ ДАННЫХ В ПАМЯТИ ==========
const users = [];           // { id, email, passwordHash }
const invitations = [];     // { id, userId, eventType, templateId, title, description, eventDate, eventLocation, customQuestions, backgroundImageUrl, isPublished, paymentStatus, uniqueLink }
const guestResponses = [];  // { id, invitationId, guestName, guestEmail, willAttend, answers, submittedAt }

const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-key-change-me';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Нет токена авторизации' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch(e) {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

// ========== API РЕГИСТРАЦИИ И ВХОДА ==========
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id: uuidv4(), email, passwordHash };
    users.push(user);
    res.json({ message: 'Пользователь создан', user: { id: user.id, email: user.email } });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user', auth, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ id: user.id, email: user.email });
});

app.get('/api/user/invitations', auth, (req, res) => {
  const userInvitations = invitations.filter(inv => inv.userId === req.userId);
  res.json(userInvitations);
});

// ========== API ПРИГЛАШЕНИЙ ==========
app.post('/api/invitations', auth, (req, res) => {
  const { eventType, templateId } = req.body;
  const invitation = {
    id: uuidv4(),
    userId: req.userId,
    eventType: eventType || 'wedding',
    templateId: templateId || 'default',
    title: '',
    description: '',
    eventDate: '',
    eventLocation: '',
    customQuestions: [],
    backgroundImageUrl: '',
    isPublished: false,
    paymentStatus: false,
    uniqueLink: uuidv4(),
    createdAt: new Date()
  };
  invitations.push(invitation);
  res.json(invitation);
});

app.get('/api/invitations/:id', auth, (req, res) => {
  const invitation = invitations.find(inv => inv.id === req.params.id && inv.userId === req.userId);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено' });
  res.json(invitation);
});

app.put('/api/invitations/:id', auth, (req, res) => {
  const invitation = invitations.find(inv => inv.id === req.params.id && inv.userId === req.userId);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено' });
  
  // Обновляем только переданные поля
  if (req.body.title !== undefined) invitation.title = req.body.title;
  if (req.body.description !== undefined) invitation.description = req.body.description;
  if (req.body.eventDate !== undefined) invitation.eventDate = req.body.eventDate;
  if (req.body.eventLocation !== undefined) invitation.eventLocation = req.body.eventLocation;
  if (req.body.customQuestions !== undefined) invitation.customQuestions = req.body.customQuestions;
  if (req.body.backgroundImageUrl !== undefined) invitation.backgroundImageUrl = req.body.backgroundImageUrl;
  
  res.json(invitation);
});

// Удаление приглашения
app.delete('/api/invitations/:id', auth, (req, res) => {
  const invitationIndex = invitations.findIndex(inv => inv.id === req.params.id && inv.userId === req.userId);
  if (invitationIndex === -1) {
    return res.status(404).json({ error: 'Приглашение не найдено' });
  }
  
  // Удаляем приглашение
  const deletedInvitation = invitations.splice(invitationIndex, 1)[0];
  
  // Удаляем все ответы гостей на это приглашение
  const responsesToDelete = guestResponses.filter(r => r.invitationId === req.params.id);
  responsesToDelete.forEach(r => {
    const index = guestResponses.findIndex(gr => gr.id === r.id);
    if (index !== -1) guestResponses.splice(index, 1);
  });
  
  res.json({ message: 'Приглашение удалено', deletedId: req.params.id });
});

// Загрузка изображения
app.post('/api/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Нет файла' });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Создание платежа (ДЕМО-РЕЖИМ без реальной оплаты)
app.post('/api/create-payment', auth, (req, res) => {
  const { invitationId } = req.body;
  const invitation = invitations.find(inv => inv.id === invitationId && inv.userId === req.userId);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено' });
  
  // Демо-режим: сразу помечаем как оплаченное
  invitation.paymentStatus = true;
  res.json({ id: 'demo', status: 'success', message: 'Демо-оплата прошла успешно' });
});

// Публикация приглашения
app.post('/api/publish/:id', auth, (req, res) => {
  const invitation = invitations.find(inv => inv.id === req.params.id && inv.userId === req.userId);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено' });
  
  if (!invitation.paymentStatus) {
    return res.status(400).json({ error: 'Сначала оплатите публикацию' });
  }
  
  // Проверяем, что заполнены обязательные поля
  if (!invitation.title || invitation.title.trim() === '') {
    return res.status(400).json({ error: 'Укажите название события' });
  }
  if (!invitation.eventDate) {
    return res.status(400).json({ error: 'Укажите дату события' });
  }
  if (!invitation.eventLocation || invitation.eventLocation.trim() === '') {
    return res.status(400).json({ error: 'Укажите место проведения' });
  }
  
  invitation.isPublished = true;
  res.json({ 
    link: `/invite/${invitation.uniqueLink}`,
    fullUrl: `${req.protocol}://${req.get('host')}/invite/${invitation.uniqueLink}`
  });
});

// ========== API ДЛЯ ГОСТЕЙ (публичные) ==========
// Получить приглашение по уникальной ссылке
app.get('/api/invite/:link', (req, res) => {
  const invitation = invitations.find(inv => inv.uniqueLink === req.params.link && inv.isPublished === true);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено или не опубликовано' });
  res.json(invitation);
});

// Отправить ответ от гостя
app.post('/api/respond/:link', (req, res) => {
  const invitation = invitations.find(inv => inv.uniqueLink === req.params.link);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено' });
  
  const { guestName, guestEmail, willAttend, answers } = req.body;
  
  if (!guestName || guestName.trim() === '') {
    return res.status(400).json({ error: 'Укажите ваше имя' });
  }
  
  const response = {
    id: uuidv4(),
    invitationId: invitation.id,
    guestName: guestName.trim(),
    guestEmail: guestEmail || '',
    willAttend: willAttend === true || willAttend === 'true',
    answers: answers || [],
    submittedAt: new Date()
  };
  guestResponses.push(response);
  res.json({ message: 'Спасибо! Ваш ответ сохранён', responseId: response.id });
});

// Получить все ответы на приглашение (только для владельца)
app.get('/api/responses/:invitationId', auth, (req, res) => {
  const invitation = invitations.find(inv => inv.id === req.params.invitationId && inv.userId === req.userId);
  if (!invitation) return res.status(403).json({ error: 'Нет доступа' });
  const responses = guestResponses.filter(r => r.invitationId === invitation.id);
  res.json(responses);
});

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ ==========
// Страница просмотра приглашения для гостя
app.get('/invite/:link', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'invite-view.html'));
});

// Для всех остальных маршрутов отдаём index.html (для поддержки клиентского роутинга)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== ЗАПУСК СЕРВЕРА ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 SERVER INVITE-SERVICE ЗАПУЩЕН!                      ║
║                                                          ║
║   📱 Локальный адрес: http://localhost:${PORT}              ║
║                                                          ║
║   💾 Данные хранятся в памяти                            ║
║   ⚡ Демо-режим: оплата не требуется                    ║
║                                                          ║
║   📋 Доступные эндпоинты:                               ║
║      POST   /api/register     - регистрация             ║
║      POST   /api/login        - вход                    ║
║      GET    /api/user         - профиль                 ║
║      GET    /api/user/invitations - мои приглашения     ║
║      POST   /api/invitations  - создать приглашение     ║
║      GET    /api/invitations/:id - получить приглашение ║
║      PUT    /api/invitations/:id - обновить приглашение ║
║      DELETE /api/invitations/:id - удалить приглашение  ║
║      POST   /api/upload       - загрузить фото          ║
║      POST   /api/create-payment - демо-оплата           ║
║      POST   /api/publish/:id  - опубликовать            ║
║      GET    /api/invite/:link - получить приглашение    ║
║      POST   /api/respond/:link - отправить ответ        ║
║      GET    /api/responses/:invitationId - ответы       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});