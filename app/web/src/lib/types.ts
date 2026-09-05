export type LoginProvider = "email" | "google" | ""

export type LastLoginMode = {
  LoginProvider: LoginProvider
  Valid: boolean
}

export type User = {
  ID: string
  Email: string
  FirstName: string
  LastName: string | null
  AvatarUrl: string | null
  IsActive: boolean
  Timezone: string
  EmailVerifiedAt: string | null
  LastLoginMode: LastLoginMode | null
  LastLoginAt: string | null
  CreatedAt: string
  UpdatedAt: string
}