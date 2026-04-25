export interface UserDtoForSelf {
  id: string
  name: string
  email: string
  created_at: string
  updated_at: string
  is_verified: boolean
}

export interface UserDtoForOthers {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  accessToken: string
  user: UserDtoForSelf
}

export interface MessageResponse {
  message: string
}
