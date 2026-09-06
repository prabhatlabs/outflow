export type LoginProvider = "email" | "google" | ""

export type LastLoginMode = {
  login_provider: LoginProvider
  valid: boolean
}

export type User = {
  id: string
  email: string
  first_name: string
  last_name: string | null
  avatar_url: string | null
  is_active: boolean
  timezone: string
  email_verified_at: string | null
  last_login_mode: LastLoginMode
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type GroupType =
  | "household"
  | "trip"
  | "roommates"
  | "couple"
  | "project"
  | "other"

export type Group = {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  type: GroupType
  default_currency: string
  created_by: string
  is_archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}