const local = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);

export const API_BASE_URL = local ? 'http://localhost:5050/api/v1' : 'https://planeta-fitness-api.onrender.com/api/v1';
export const API_TIMEOUT_MS = 10000;
