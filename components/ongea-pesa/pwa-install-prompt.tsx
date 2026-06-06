"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true);
            return;
        }

        const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
        if (dismissedAt) {
            const dismissedDate = new Date(dismissedAt);
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) return;
        }

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isInStandaloneMode = ("standalone" in window.navigator) && (window.navigator as any).standalone;

        if (isIOS && !isInStandaloneMode) {
            setTimeout(() => setShowIOSPrompt(true), 3000);
            return;
        }

        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(() => setShowInstallPrompt(true), 2000);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setIsInstalled(true);
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
        setShowIOSPrompt(false);
        localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString());
    };

    if (isInstalled) return null;

    /** Shared wrapper — slides down from top, safe-area-aware */
    const wrapperCls =
        "fixed left-4 right-4 z-50 animate-in slide-in-from-top duration-300 " +
        "top-[calc(env(safe-area-inset-top,0px)+1rem)]";

    /** Shared card styles — clean tokens, matches the redesign */
    const cardCls =
        "rounded-2xl border border-border/60 bg-card shadow-xl backdrop-blur-xl " +
        "overflow-hidden";

    // iOS install instructions
    if (showIOSPrompt) {
        return (
            <div className={wrapperCls}>
                <div className={cardCls}>
                    <div className="flex items-start gap-3 p-4">
                        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Smartphone className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Install Ongea Pesa</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Add to Home Screen for the fastest experience:
                            </p>
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                <span>1. Tap</span>
                                <Share className="h-3 w-3 shrink-0" />
                                <span>→ &quot;Add to Home Screen&quot;</span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Standard prompt (Chrome / Edge)
    if (showInstallPrompt && deferredPrompt) {
        return (
            <div className={wrapperCls}>
                <div className={cardCls}>
                    <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center flex-shrink-0">
                            <Download className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Install Ongea Pesa</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Quick access from your home screen
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDismiss}
                                className="text-muted-foreground hover:text-foreground px-2"
                            >
                                Later
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleInstallClick}
                                className="bg-brand hover:bg-brand/90 text-white"
                            >
                                Install
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
