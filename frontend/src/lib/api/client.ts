import axios from "axios";
import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import type { paths } from "./generated/api-types";

// Use runtime config if available (from Docker), fallback to build-time env for local dev
const API_BASE_URL = window.ENV?.VITE_API_URL || import.meta.env.VITE_API_URL

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

const fetchClient = createFetchClient<paths>({
  baseUrl: API_BASE_URL,
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
});

fetchClient.use({
  onResponse: ({ response }) => {
    if (response.status === 401) {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
  },
});

const $api = createClient(fetchClient);

export { apiClient, $api };
