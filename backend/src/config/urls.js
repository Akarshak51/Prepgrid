const trimTrailingSlash = (url) => (url ? url.replace(/\/+$/, '') : '');

const getClientUrl = () => trimTrailingSlash(process.env.CLIENT_URL) || 'http://localhost:5173';

const getApiUrl = () => trimTrailingSlash(process.env.API_URL) || `http://localhost:${process.env.PORT || 5000}`;

module.exports = {
  getApiUrl,
  getClientUrl,
  trimTrailingSlash,
};
