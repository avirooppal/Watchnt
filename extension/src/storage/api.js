import { getConfig } from './local.js';

async function baseApiCall(method, path, body = null) {
  const config = await getConfig();
  const apiHost = config.apiHost || 'http://localhost:3001';

  const headers = {
    'Content-Type': 'application/json'
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${apiHost}${path}`, options);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${res.status}`);
  }

  return res.json();
}

export const checkApiConnection = async () => {
  try {
    await baseApiCall('GET', '/health');
    return true;
  } catch (err) {
    return false;
  }
};

export const api = {
  get: (path) => baseApiCall('GET', path),
  post: (path, body) => baseApiCall('POST', path, body)
};

export default api;
