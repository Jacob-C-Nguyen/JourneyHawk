const API_URL = "http://192.168.86.31:3000";

export async function checkHealth() {
  const response = await fetch(`${API_URL}/api/health`);
  return response.json();
}