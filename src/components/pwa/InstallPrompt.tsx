'use client'

import { useState } from 'react'
import { usePWA } from '@/hooks/use-pwa'
import {
  DynamicButton,
  DynamicCard,
  DynamicCardContent,
  DynamicCardDescription,
  DynamicCardHeader,
  DynamicCardTitle,
  DynamicX,
  DynamicDownload,
  DynamicSmartphone
} from '@/lib/dynamic-imports'

export function InstallPrompt() {
  const { isInstalled, showPrompt, install, dismiss, isIOS, canPrompt } = usePWA()
  const [showInstructions, setShowInstructions] = useState(false)

  if (isInstalled || !showPrompt) return null

  const handleInstallClick = async () => {
    if (canPrompt) {
      await install()
    } else {
      setShowInstructions(!showInstructions)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DynamicCard className="border-primary/20 bg-background/95 backdrop-blur-sm shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/10" />
        <DynamicCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DynamicCardTitle className="text-lg flex items-center gap-2 font-bold tracking-tight">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <DynamicSmartphone className="h-5 w-5 text-primary" />
              </div>
              Install Centric Fit
            </DynamicCardTitle>
            <DynamicButton
              variant="ghost"
              size="icon"
              onClick={dismiss}
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <DynamicX className="h-4 w-4" />
            </DynamicButton>
          </div>
          <DynamicCardDescription className="text-sm leading-relaxed mt-2">
            {isIOS
              ? 'Add to home screen for a seamless mobile experience'
              : showInstructions
                ? 'Follow these steps to manually install'
                : 'Install our app for faster access, offline use, and a better experience.'}
          </DynamicCardDescription>
        </DynamicCardHeader>
        <DynamicCardContent className="pt-2">
          {(isIOS || showInstructions) ? (
            <div className="space-y-3 rounded-xl bg-muted/50 p-3 border border-border/50">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 text-xs">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">1</div>
                    <p>Tap the <span className="font-semibold text-foreground underline decoration-primary/30">Share button</span> (square with up arrow) in Safari.</p>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">2</div>
                    <p>Scroll down and select <span className="font-semibold text-foreground underline decoration-primary/30">&quot;Add to Home Screen&quot;</span>.</p>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">3</div>
                    <p>Tap <span className="font-semibold text-foreground">Add</span> in the top right corner.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 text-xs">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">1</div>
                    <p>Click the <span className="font-semibold text-foreground underline decoration-primary/30">Install icon</span> in the browser address bar (top right).</p>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">2</div>
                    <p>Or open the <span className="font-semibold text-foreground underline decoration-primary/30">Browser Menu</span> (three dots/lines) and find &quot;Install App&quot; or &quot;Save and Share&quot; &gt; &quot;Install App&quot;.</p>
                  </div>
                  <DynamicButton onClick={() => setShowInstructions(false)} variant="ghost" size="sm" className="w-full text-[10px] h-6">
                    Back to install
                  </DynamicButton>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <DynamicButton
                onClick={handleInstallClick}
                className="flex-1 font-semibold shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
                size="sm"
              >
                <DynamicDownload className="h-4 w-4 mr-2" />
                {canPrompt ? 'Install App' : 'How to Install'}
              </DynamicButton>
              <DynamicButton
                onClick={dismiss}
                variant="outline"
                size="sm"
                className="border-primary/20 hover:bg-primary/5 shadow-sm"
              >
                Later
              </DynamicButton>
            </div>
          )}
          {!isIOS && !canPrompt && !showInstructions && (
            <p className="text-[10px] text-muted-foreground mt-3 text-center italic">
              Can&apos;t find the button? Click &quot;How to Install&quot; above.
            </p>
          )}
        </DynamicCardContent>
      </DynamicCard>
    </div>
  )
}