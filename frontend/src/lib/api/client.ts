import axios from "axios";
import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import type { paths } from "./generated/api-types";

const apiClient = axios.create({
  baseURL: window.location.origin,
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
  baseUrl: window.location.origin,
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
});

const $api = createClient(fetchClient);

export { apiClient, $api };
