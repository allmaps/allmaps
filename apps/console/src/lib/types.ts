export type Organization = {
  id: string
  name: string
  slug: string
  createdAt: string
  domains: string[]
  plan: string | null
  users?: {
    role: string
    createdAt: string
    user: {
      id: string
      name: string
      email: string
    }
  }[]
}
