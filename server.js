require('dotenv').config();
const express = require('express');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8070);

const app = express();
app.use(express.json());

// Хранилище в памяти: после перезапуска сервиса список регистраций пустой.
const guests = new Map();
let nextId = 1;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';
const isValidEmail = (value) => typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
const isValidPlusOnes = (value) => Number.isInteger(value) && value >= 0 && value <= 5;

const findGuest = (req, res) => {
  const id = Number(req.params.id);
  const guest = Number.isInteger(id) ? guests.get(id) : undefined;
  if (!guest) {
    res.status(404).json({ error: 'Guest not found' });
    return null;
  }
  return guest;
};

const emailTaken = (email, exceptId) =>
  [...guests.values()].some((g) => g.email === email.toLowerCase() && g.id !== exceptId);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/v1/guests', (req, res) => {
  const { name, email, plus_ones = 0 } = req.body;
  if (!isNonEmptyString(name) || !isValidEmail(email) || !isValidPlusOnes(plus_ones)) {
    return res.status(400).json({ error: 'name, valid email and plus_ones (0-5) are required' });
  }
  if (emailTaken(email)) {
    return res.status(409).json({ error: 'Email is already registered' });
  }
  const guest = {
    id: nextId++,
    name: name.trim(),
    email: email.toLowerCase(),
    plus_ones,
    checked_in: false,
    registered_at: new Date().toISOString(),
  };
  guests.set(guest.id, guest);
  res.status(201).json(guest);
});

app.get('/api/v1/guests', (req, res) => {
  let result = [...guests.values()];
  if (req.query.checked_in !== undefined) {
    result = result.filter((g) => String(g.checked_in) === req.query.checked_in);
  }
  if (req.query.name) {
    const needle = String(req.query.name).toLowerCase();
    result = result.filter((g) => g.name.toLowerCase().includes(needle));
  }
  res.json(result);
});

app.get('/api/v1/guests/stats', (req, res) => {
  const all = [...guests.values()];
  res.json({
    registered: all.length,
    checked_in: all.filter((g) => g.checked_in).length,
    total_people: all.reduce((sum, g) => sum + 1 + g.plus_ones, 0),
  });
});

app.get('/api/v1/guests/:id', (req, res) => {
  const guest = findGuest(req, res);
  if (guest) res.json(guest);
});

app.patch('/api/v1/guests/:id', (req, res) => {
  const guest = findGuest(req, res);
  if (!guest) return;
  const { name, email, plus_ones, checked_in } = req.body;
  if (name !== undefined && !isNonEmptyString(name)) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (email !== undefined && !isValidEmail(email)) {
    return res.status(400).json({ error: 'email is invalid' });
  }
  if (plus_ones !== undefined && !isValidPlusOnes(plus_ones)) {
    return res.status(400).json({ error: 'plus_ones must be an integer 0-5' });
  }
  if (checked_in !== undefined && typeof checked_in !== 'boolean') {
    return res.status(400).json({ error: 'checked_in must be boolean' });
  }
  if (email !== undefined && emailTaken(email, guest.id)) {
    return res.status(409).json({ error: 'Email is already registered' });
  }
  if (name !== undefined) guest.name = name.trim();
  if (email !== undefined) guest.email = email.toLowerCase();
  if (plus_ones !== undefined) guest.plus_ones = plus_ones;
  if (checked_in !== undefined) guest.checked_in = checked_in;
  res.json(guest);
});

app.delete('/api/v1/guests/:id', (req, res) => {
  const guest = findGuest(req, res);
  if (!guest) return;
  guests.delete(guest.id);
  res.status(204).send();
});

const server = app.listen(PORT, HOST, () => {
  console.log(`meetup-rsvp-api listening on http://${HOST}:${PORT}`);
});

// Корректная остановка по сигналу от systemd.
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
