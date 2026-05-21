export type Organization = {
  id: string
  name: string
  slug: string
  logo?: string | null
  homepage?: string | null
  createdAt: string
  domains: string[]
  plan: 'supporter' | 'innovator' | null
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
