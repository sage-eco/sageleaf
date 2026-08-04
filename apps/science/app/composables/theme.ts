import { useColorMode } from '@vueuse/core'

export const useThemeMode = () =>
  useColorMode({
    selector: 'html',
    attribute: 'data-theme',
  })
