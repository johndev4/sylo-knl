import * as React from "react"

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    className={`h-4 w-4 rounded border border-primary ring-offset-background cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
    {...props}
  />
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
