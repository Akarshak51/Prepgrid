const mongoose = require('mongoose');
const { pickFirst } = require('./env');

const buildMongoUri = () => {
  const directUri = pickFirst(process.env.MONGO_URI, process.env.MONGODB_URI, process.env.DATABASE_URL);
  if (directUri) {
    return directUri;
  }

  const user = pickFirst(process.env.MONGO_USER);
  const pass = pickFirst(process.env.MONGO_PASS);
  const host = pickFirst(process.env.MONGO_HOST);
  const dbName = pickFirst(process.env.MONGO_DB_NAME) || 'prepgrid';

  if (user && pass && host) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/${dbName}?retryWrites=true&w=majority`;
  }

  return null;
};

const connectDB = async () => {
  const mongoUri = buildMongoUri();
  if (!mongoUri) {
    console.error('MongoDB error: missing database connection. Set MONGO_URI (or MONGODB_URI / DATABASE_URL) in Render, or provide MONGO_USER, MONGO_PASS, and MONGO_HOST.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
