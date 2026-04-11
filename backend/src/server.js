require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();
const normalizeOrigin = (origin = '') => origin.replace(/\/+$/, '');
const allowedOrigins = [...new Set(
  [process.env.CLIENT_URL, 'http://localhost:5173']
    .flatMap((value) => (value || '').split(','))
    .map((value) => normalizeOrigin(value.trim()))
    .filter(Boolean)
)];

// Security
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.includes(normalizeOrigin(origin)));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' });
app.use('/api/', limiter);

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'AI rate limit: 10 req/min' });
app.use('/api/interview', aiLimiter);
app.use('/api/quiz/generate', aiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/practice', require('./routes/practice'));
app.use('/api/interview', require('./routes/interview'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (_, res) => res.json({
  message: 'Prepgrid API is running',
  health: '/api/health',
}));
app.get('/favicon.ico', (_, res) => res.status(204).end());
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// 404 & Error
app.use((_, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, _, res, __) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

// Start
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

