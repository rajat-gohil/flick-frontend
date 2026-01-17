export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem("auth_token"));
}

export function logout() {
  localStorage.removeItem("auth_token");
}
