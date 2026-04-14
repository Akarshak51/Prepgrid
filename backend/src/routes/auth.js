const express = require('express');
const passport = require('passport');
const c = require('../controllers/authController');
const { isGoogleAuthEnabled } = require('../config/env');
const { getClientUrl } = require('../config/urls');
const { protect } = require('../middlewares/auth');

const r = express.Router();

r.post('/register', c.register);
r.post('/login', c.login);
r.post('/refresh', c.refreshToken);
r.post('/forgot-password', c.forgotPassword);
r.post('/reset-password', c.resetPassword);
r.get('/me', protect, c.getMe);

if (isGoogleAuthEnabled()) {
  const failureRedirect = `${getClientUrl()}/login?error=Google+auth+failed`;

  r.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  r.get('/google/callback', passport.authenticate('google', { failureRedirect }), c.googleCallback);
} else {
  const googleDisabled = (_, res) => res.status(503).json({ message: 'Google login is not configured on this server' });

  r.get('/google', googleDisabled);
  r.get('/google/callback', googleDisabled);
}

module.exports = r;
