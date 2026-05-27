import axios from 'axios';

/**
 * Base URL. Set VITE_API_URL in .env.local to override.
 * New modules should use the Supabase client (src/services/supabase.ts) directly.
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Branch APIs ──────────────────────────────────────────────────────────────

export async function createBranch(pg) {
  const response = await axios.post(BASE_URL + '/branches', pg);
  return response.data;
}

export async function getBranches(ownerId) {
  const response = await axios.get(BASE_URL + '/branches/' + ownerId);
  return response.data;
}

export async function updateBranch(pgId, updates) {
  const response = await axios.patch(BASE_URL + '/branches/' + pgId, updates);
  return response.data;
}

export async function deletepgBranch(pgId) {
  const response = await axios.delete(BASE_URL + '/branches/' + pgId);
  return response.data;
}

// ─── Guest APIs ───────────────────────────────────────────────────────────────

export async function createGuest(guest) {
  const response = await axios.post(BASE_URL + '/guest', guest);
  return response.data;
}

export async function getGuest(guestId) {
  const response = await axios.get(BASE_URL + '/guest/' + guestId);
  return response.data;
}

export async function updateGuest(guestId, updates) {
  const response = await axios.patch(BASE_URL + '/guest/' + guestId, updates);
  return response.data;
}

export async function deleteGuest(guestId) {
  const response = await axios.delete(BASE_URL + '/guest/' + guestId);
  return response.data;
}

// ─── Room APIs ────────────────────────────────────────────────────────────────

export async function createRoom(room) {
  const response = await axios.post(BASE_URL + '/rooms', room);
  return response.data;
}

/**
 * Fetches a single room by roomId.
 * Endpoint: GET /rooms/room/:roomId
 * URL collision with getRoomsByBranch resolved by adding /room/ prefix.
 */
export async function getRoom(roomId) {
  const response = await axios.get(BASE_URL + '/rooms/room/' + roomId);
  return response.data;
}

/**
 * Fetches all rooms for a branch.
 * Endpoint: GET /rooms/branch/:branchId
 */
export async function getRoomsByBranch(branchId) {
  const response = await axios.get(BASE_URL + '/rooms/branch/' + branchId);
  return response.data;
}

export async function updateRoom(roomId, updates) {
  const response = await axios.patch(BASE_URL + '/rooms/' + roomId, updates);
  return response.data;
}

export async function deleteRoom(roomId) {
  const response = await axios.delete(BASE_URL + '/rooms/' + roomId);
  return response.data;
}
