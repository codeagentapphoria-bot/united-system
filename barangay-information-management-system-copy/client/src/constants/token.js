let _token = null;

export const setToken = (token) => {
  _token = token;
};

export const getToken = () => _token;

export const removeToken = () => {
  _token = null;
};

export const decodeToken = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));
    return payload;
  } catch (error) {
    return null;
  }
};

export const getRoleFromToken = () => {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.target_type || null;
};

export const getPermissionLevelFromToken = () => {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.role || null;
};
