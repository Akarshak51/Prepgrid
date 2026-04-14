const hasValue = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
};

const pickFirst = (...values) => {
  const match = values.find(hasValue);
  return typeof match === 'string' ? match.trim() : match;
};

const isProduction = () => process.env.NODE_ENV === 'production';

const isGoogleAuthEnabled = () => Boolean(
  pickFirst(process.env.GOOGLE_CLIENT_ID) && pickFirst(process.env.GOOGLE_CLIENT_SECRET)
);

const getSessionSecret = () => pickFirst(process.env.SESSION_SECRET, process.env.JWT_SECRET);

const getMissingRequiredEnv = () => ['JWT_SECRET', 'JWT_REFRESH_SECRET'].filter((name) => !pickFirst(process.env[name]));

module.exports = {
  getMissingRequiredEnv,
  getSessionSecret,
  hasValue,
  isGoogleAuthEnabled,
  isProduction,
  pickFirst,
};
