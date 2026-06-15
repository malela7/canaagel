import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const access = await AsyncStorage.getItem("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response && response.status === 401 && !config._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, config });
        });
      }
      config._retry = true;
      isRefreshing = true;
      try {
        const refresh = await AsyncStorage.getItem("refresh");
        if (!refresh) throw new Error("No refresh token");
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh });
        await AsyncStorage.setItem("access", data.access);
        refreshQueue.forEach((p) => {
          p.config.headers.Authorization = `Bearer ${data.access}`;
          p.resolve(api(p.config));
        });
        refreshQueue = [];
        isRefreshing = false;
        config.headers.Authorization = `Bearer ${data.access}`;
        return api(config);
      } catch (err) {
        refreshQueue.forEach((p) => p.reject(err));
        refreshQueue = [];
        isRefreshing = false;
        await AsyncStorage.multiRemove(["access", "refresh"]);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
