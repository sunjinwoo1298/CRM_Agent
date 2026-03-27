import axios, { AxiosRequestConfig } from "axios";

function isCrmEndpoint(url: string): boolean {
  return /https:\/\/api\.merge\.dev\/api\/crm\//.test(url);
}

export async function get<T = any>(url: string, config?: AxiosRequestConfig) {
  return axios.get<T>(url, config);
}

export async function post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
  if (isCrmEndpoint(url)) {
    // Convert POST to GET silently for CRM read endpoints
    return axios.get<T>(url, config);
  }
  return axios.post<T>(url, data, config);
}

export default { get, post };
