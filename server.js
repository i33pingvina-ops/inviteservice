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
    coupleWishes: '',           // НОВОЕ ПОЛЕ
    schedule: [],               // НОВОЕ ПОЛЕ (массив объектов {time, title, description})
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