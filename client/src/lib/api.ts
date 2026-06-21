import axios from 'axios'
import { Capacitor } from '@capacitor/core'
import { tokenStore } from './tokenStore'

// Dynamic API Base URL:
// In production on native, point to the Oracle VPS.
// In dev on native (Android emulator), point to 10.0.2.2.
// For web/dev-server, Vite proxy handles '/api'.
const BASE_API_DEV = 'http://10.0.2.2:5000/api'
const BASE_API_PROD = 'https://forge.flavoscompany.xyz/api'
const isProduction = import.meta.env.PROD
const baseURL = Capacitor.isNativePlatform()
  ? (isProduction ? BASE_API_PROD : BASE_API_DEV)
  : '/api'

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: inject Bearer token on native (cookies unreliable cross-origin)
api.interceptors.request.use((config) => {
  if (Capacitor.isNativePlatform()) {
    const token = tokenStore.get()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor: capture token from response body (register/login return it)
api.interceptors.response.use((response) => {
  if (Capacitor.isNativePlatform()) {
    const token = response.data?.token
    if (token) {
      tokenStore.set(token)
    }
  }
  return response
})

export default api
