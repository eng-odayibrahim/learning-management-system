import { CloseCircleIcon, StarIcon } from '@solar-icons/react/outline';
import * as React from "react"
import { cn } from "@/lib/utils"


interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const DialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({ open: false, onOpenChange: () => { } })

export const Dialog: React.FC<DialogProps> = ({
  open = false,
  onOpenChange = () => { },
  children,
}) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export const DialogTrigger: React.FC<{
  asChild?: boolean
  children: React.ReactNode
}> = ({ children }) => {
  const { onOpenChange } = React.useContext(DialogContext)
  return (
    <div
      onClick={() => onOpenChange(true)}
      className="inline-block cursor-pointer"
    >
      {children}
    </div>
  )
}

export const DialogContent: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  const { open, onOpenChange } = React.useContext(DialogContext)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative z-50 grid w-full max-w-lg gap-4 rounded-xl border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95",
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <CloseCircleIcon className="h-4 w-4" />
          <span className="sr-only">إغلاق</span>
        </button>
        {children}
      </div>
    </div>
  )
}

export const DialogHeader: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-right",
      className
    )}
  >
    {children}
  </div>
)

export const DialogTitle: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <h2
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
  >
    {children}
  </h2>
)

export const DialogDescription: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <p className={cn("text-sm text-muted-foreground", className)}>
    {children}
  </p>
)

export const DialogFooter: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 sm:space-x-reverse gap-2",
      className
    )}
  >
    {children}
  </div>
)
