import { ofetch, type FetchOptions } from "ofetch";

const API_BASE_URL =
  import.meta.env["VITE_API_BASE_URL"] || "http://localhost:3000";

export const apiClient = ofetch.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  onRequest({ options }: { options: FetchOptions }) {
    const token = localStorage.getItem("omnimedix_token");
    if (token) {
      options.headers = new Headers(options.headers);
      options.headers.set("Authorization", `Bearer ${token}`);
    }
  },
  onResponseError({ response }) {
    if (response?.status === 401) {
      // Clear token on 401 Unauthorized
      localStorage.removeItem("omnimedix_token");
    }
  },
});
