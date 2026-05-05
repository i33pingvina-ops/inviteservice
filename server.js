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
const users = [];
const invitations = [];
const guestResponses = [];

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
  
  Object.assign(invitation, req.body);
  res.json(invitation);
});

app.post('/api/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Нет файла' });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

app.post('/api/create-payment', auth, (req, res) => {
  const { invitationId } = req.body;
  const invitation = invitations.find(inv => inv.id === invitationId && inv.userId === req.userId);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено' });
  invitation.paymentStatus = true;
  res.json({ id: 'demo', url: '#' });
});

app.post('/api/publish/:id', auth, (req, res) => {
  const invitation = invitations.find(inv => inv.id === req.params.id && inv.userId === req.userId);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено' });
  if (!invitation.paymentStatus) {
    return res.status(400).json({ error: 'Сначала оплатите публикацию' });
  }
  invitation.isPublished = true;
  res.json({ link: `/invite/${invitation.uniqueLink}` });
});

// ========== API ДЛЯ ГОСТЕЙ ==========
app.get('/api/invite/:link', (req, res) => {
  const invitation = invitations.find(inv => inv.uniqueLink === req.params.link && inv.isPublished === true);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено или не опубликовано' });
  res.json(invitation);
});

app.post('/api/respond/:link', (req, res) => {
  const invitation = invitations.find(inv => inv.uniqueLink === req.params.link);
  if (!invitation) return res.status(404).json({ error: 'Приглашение не найдено' });
  
  const { guestName, guestEmail, willAttend, answers } = req.body;
  const response = {
    id: uuidv4(),
    invitationId: invitation.id,
    guestName: guestName || 'Аноним',
    guestEmail: guestEmail || '',
    willAttend: willAttend === true || willAttend === 'true',
    answers: answers || [],
    submittedAt: new Date()
  };
  guestResponses.push(response);
  res.json({ message: 'Спасибо! Ваш ответ сохранён' });
});

app.get('/api/responses/:invitationId', auth, (req, res) => {
  const invitation = invitations.find(inv => inv.id === req.params.invitationId && inv.userId === req.userId);
  if (!invitation) return res.status(403).json({ error: 'Нет доступа' });
  const responses = guestResponses.filter(r => r.invitationId === invitation.id);
  res.json(responses);
});

// Страница просмотра приглашения для гостя
app.get('/invite/:link', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'invite-view.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 Сервер запущен!                    ║
║   📱 Откройте: http://localhost:${PORT}    ║
║   💾 Данные хранятся в памяти            ║
╚════════════════════════════════════════╝
  `);
});