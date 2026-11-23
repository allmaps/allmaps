export type LoginUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export type SignInProvider = {
  provider: string
  url: string
}

export type AccountLink = {
  label: string
  href: string
}
