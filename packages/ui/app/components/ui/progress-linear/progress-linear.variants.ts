import { cva } from 'class-variance-authority'

export const progressLinearVariants = cva('relative overflow-hidden w-full', {
  variants: {
    rounded: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full',
    },
  },
  defaultVariants: {
    rounded: 'full',
  },
})
