import axios, { AxiosError, type Method } from "axios";

import { useAuthStore } from "@/lib/auth-store";

export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v3";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string;
};

export const http = axios.create({ baseURL: API_URL });

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

export async function api<T>(
  path: string,
  options: { method?: Method; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  try {
    const res = await http.request<ApiResponse<T>>({
      url: path,
      method,
      data: body,
      skipAuth: !auth,
    });

    if (res.data?.success === false) {
      throw new ApiError(
        res.status,
        res.data.errors ?? res.data.message ?? `Request failed (${res.status})`,
      );
    }
    return res.data.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    const axiosErr = err as AxiosError<ApiResponse<T>>;
    if (!axiosErr.response) {
      throw new ApiError(0, `เชื่อมต่อ Backend ไม่ได้ (${API_URL})`);
    }

    const { status, data } = axiosErr.response;
    if (auth && (status === 401 || status === 403)) {
      useAuthStore.getState().clear();
    }
    throw new ApiError(
      status,
      data?.errors ?? data?.message ?? `Request failed (${status})`,
    );
  }
}
