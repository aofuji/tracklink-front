export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface AuthenticatedUser {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}
