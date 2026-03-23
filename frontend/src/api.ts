import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;
const baseURL = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "/";

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});
