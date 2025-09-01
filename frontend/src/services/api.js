import axios from "axios";

const baseUrl = 'http://localhost:8000/api';

// Configure axios defaults
axios.defaults.withCredentials = true; // For Django sessions

const login = (credentials) => {
  const request = axios.post(`${baseUrl}/login/`, credentials);
  return request.then(response => response.data);
};

const register = (userData) => {
  const request = axios.post(`${baseUrl}/register/`, userData);
  return request.then(response => response.data);
};

const logout = () => {
  const request = axios.post(`${baseUrl}/logout/`);
  return request.then(response => response.data);
};

export default { login, register, logout };