import { getContext, setContext } from 'svelte'

type CheckboxGroup = {
  includes: (value: string) => boolean
  setChecked: (value: string, checked: boolean) => void
}

const key = Symbol('dropdown-menu-checkbox-group')
export const getCheckboxGroup = () => getContext<CheckboxGroup | undefined>(key)
export const setCheckboxGroup = (group: CheckboxGroup) => setContext(key, group)
