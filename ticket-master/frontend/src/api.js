import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

export const searchEvents = (params) => axios.get(`${API_BASE}/events/search`, { params });
export const getEvent = (eventId) => axios.get(`${API_BASE}/events/${eventId}`);
export const bookTickets = (eventId, data) => axios.post(`${API_BASE}/bookings/${eventId}`, data);
