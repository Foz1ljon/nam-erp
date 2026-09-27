import type { Role } from '../utils/constants'

declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    fullName: string
    role: Role
    locationId: string | null
    /** False until the user has gone through the first-run introduction. */
    onboarded?: boolean
  }
}

export {}
