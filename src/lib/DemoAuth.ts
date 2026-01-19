import { apiRequest } from "./api";

const DEMO_EMAIL = "demo@flick.app";
const DEMO_PASSWORD = "demo1234!";

export async function loginAsDemo() {
  return apiRequest("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    }),
  });
}
