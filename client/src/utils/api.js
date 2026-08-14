export const fetchWithAuth = async (url, options = {}) => {
  let token = localStorage.getItem('token');
  
  // Ensure headers exist and add the Authorization header
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  // If we get a 401 Unauthorized, the access token might be expired. Let's try to refresh it.
  if (response.status === 401) {
    try {
      // Call the refresh endpoint. credentials: 'include' is required to send the HttpOnly cookie
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (refreshRes.ok) {
        // Success! We got a new access token
        const data = await refreshRes.json();
        localStorage.setItem('token', data.token);
        
        // Retry the original request with the new token
        headers.set('Authorization', `Bearer ${data.token}`);
        response = await fetch(url, { ...options, headers });
      } else {
        // Refresh failed (refresh token is expired or invalid) - force logout
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } catch (err) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }

  return response;
};
