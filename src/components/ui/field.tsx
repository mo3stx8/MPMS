import * as React from "react"
import { cn } from "./utils"
import { Label } from "./label"

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn("text-sm font-semibold text-foreground/90", className)}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function FieldSeparator({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-separator"
      className={cn("relative flex items-center py-2", className)}
      {...props}
    >
      <div className="flex-grow border-t border-border"></div>
      {children && (
        <span 
          data-slot="field-separator-content"
          className="mx-4 flex-shrink text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {children}
        </span>
      )}
      <div className="flex-grow border-t border-border"></div>
    </div>
  )
}

export {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldSeparator,
}
