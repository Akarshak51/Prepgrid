const { pickFirst } = require('./env');

const trimTrailingSlash = (url) => (url ? url.replace(/\/+$/, '') : '');

const getClientUrl = () => trimTrailingSlash(pickFirst(process.env.CLIENT_URL)) || 'http://localhost:5173';

const getApiUrl = () => trimTrailingSlash(pickFirst(process.env.API_URL)) || `http://localhost:${process.env.PORT || 5000}`;

const getGoogleRedirectUrl = () => trimTrailingSlash(pickFirst(process.env.GOOGLE_REDIRECT_URI)) || `${getApiUrl()}/api/auth/google/callback`;

module.exports = {
  getApiUrl,
  getClientUrl,
  getGoogleRedirectUrl,
  trimTrailingSlash,
};
