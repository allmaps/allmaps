/** Prop helpers shared by the shadcn-based Allmaps components. */
export type WithoutChild<T> = Omit<T, 'child'>
export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>
export type WithElementRef<
  T,
  Element extends HTMLElement = HTMLDivElement
> = T & {
  ref?: Element | null
}
