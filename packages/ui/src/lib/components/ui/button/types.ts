import type { Snippet } from 'svelte'
import type {
  HTMLAnchorAttributes,
  HTMLButtonAttributes
} from 'svelte/elements'

export type ButtonVariant = 'default' | 'primary' | 'destructive'

export type ButtonShape = 'rounded' | 'pill'

type SharedProps = {
  children?: Snippet
  icon?: Snippet
  iconPosition?: 'leading' | 'trailing'
  variant?: ButtonVariant
  shape?: ButtonShape
  iconOnly?: boolean
  active?: boolean
  loading?: boolean
  loadingIndicator?: Snippet
  disabled?: boolean
  ref?: HTMLButtonElement | HTMLAnchorElement | null
}

export type ButtonProps = SharedProps &
  (
    | (Omit<HTMLButtonAttributes, 'children'> & { href?: never })
    | (Omit<HTMLAnchorAttributes, 'children' | 'type'> & {
        href: string
        type?: never
      })
  )
