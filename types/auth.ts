export interface User {
  id: string
  email: string
  username: string
  verified: boolean
  avatarImage?: string | null
  bannerImage?: string | null
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: User
}
