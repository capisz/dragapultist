export interface User {
  id: string
  email: string
  username: string
  verified: boolean
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: User
}
