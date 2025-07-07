"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      expand={false}
      richColors={false}
      closeButton
      gap={12}
      duration={8000}
      toastOptions={{
        unstyled: true,
        duration: 8000,
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:flex group-[.toaster]:items-start group-[.toaster]:gap-3 group-[.toaster]:min-w-[320px] group-[.toaster]:max-w-[420px] group-[.toaster]:backdrop-blur-sm group-[.toaster]:transition-all group-[.toaster]:duration-300 group-[.toaster]:transform hover:group-[.toaster]:scale-[1.02] hover:group-[.toaster]:shadow-2xl",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm group-[.toast]:leading-tight",
          description: "group-[.toast]:text-sm group-[.toast]:text-muted-foreground group-[.toast]:mt-1 group-[.toast]:leading-relaxed",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-medium hover:group-[.toast]:bg-primary/90 group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:transform hover:group-[.toast]:scale-105 group-[.toast]:shadow-sm group-[.toast]:cursor-pointer",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-medium hover:group-[.toast]:bg-muted/80 group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:transform hover:group-[.toast]:scale-105 group-[.toast]:cursor-pointer",
          closeButton: "group-[.toast]:absolute group-[.toast]:top-2 group-[.toast]:right-2 group-[.toast]:bg-transparent hover:group-[.toast]:bg-muted/50 group-[.toast]:rounded-lg group-[.toast]:p-1.5 group-[.toast]:opacity-50 hover:group-[.toast]:opacity-100 group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:transform hover:group-[.toast]:scale-110 group-[.toast]:cursor-pointer group-[.toast]:z-50 group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:min-w-[24px] group-[.toast]:min-h-[24px]",
          // Enhanced type-specific styles with gradients and better colors
          error: "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-red-50 group-[.toaster]:to-red-50/80 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200/60 group-[.toaster]:shadow-red-100/50 dark:group-[.toaster]:from-red-950/20 dark:group-[.toaster]:to-red-900/10 dark:group-[.toaster]:text-red-100 dark:group-[.toaster]:border-red-800/30 dark:group-[.toaster]:shadow-red-900/20",
          success: "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-green-50 group-[.toaster]:to-emerald-50/80 group-[.toaster]:text-green-900 group-[.toaster]:border-green-200/60 group-[.toaster]:shadow-green-100/50 dark:group-[.toaster]:from-green-950/20 dark:group-[.toaster]:to-emerald-900/10 dark:group-[.toaster]:text-green-100 dark:group-[.toaster]:border-green-800/30 dark:group-[.toaster]:shadow-green-900/20",
          warning: "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-yellow-50 group-[.toaster]:to-orange-50/80 group-[.toaster]:text-yellow-900 group-[.toaster]:border-yellow-200/60 group-[.toaster]:shadow-yellow-100/50 dark:group-[.toaster]:from-yellow-950/20 dark:group-[.toaster]:to-orange-900/10 dark:group-[.toaster]:text-yellow-100 dark:group-[.toaster]:border-yellow-800/30 dark:group-[.toaster]:shadow-yellow-900/20",
          info: "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-blue-50 group-[.toaster]:to-cyan-50/80 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-200/60 group-[.toaster]:shadow-blue-100/50 dark:group-[.toaster]:from-blue-950/20 dark:group-[.toaster]:to-cyan-900/10 dark:group-[.toaster]:text-blue-100 dark:group-[.toaster]:border-blue-800/30 dark:group-[.toaster]:shadow-blue-900/20",
          loading: "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-gray-50 group-[.toaster]:to-slate-50/80 group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200/60 group-[.toaster]:shadow-gray-100/50 dark:group-[.toaster]:from-gray-950/20 dark:group-[.toaster]:to-slate-900/10 dark:group-[.toaster]:text-gray-100 dark:group-[.toaster]:border-gray-800/30",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 drop-shadow-sm" />,
        error: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 drop-shadow-sm" />,
        warning: <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 drop-shadow-sm" />,
        info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 drop-shadow-sm" />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-gray-600 dark:text-gray-400 shrink-0 drop-shadow-sm" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
