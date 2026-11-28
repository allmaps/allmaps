// SDK parts accept arbitrary attributes. Keep their named props when overriding a binding.
export type NamedProps<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

export type Rounded = 'rounded' | 'full'

/** Prop helpers shared by the shadcn-based Allmaps components. */
export type WithoutChild<T> = Omit<T, 'child'>
export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>
export type WithElementRef<
  T,
  Element extends HTMLElement = HTMLDivElement
> = T & {
  ref?: Element | null
}
