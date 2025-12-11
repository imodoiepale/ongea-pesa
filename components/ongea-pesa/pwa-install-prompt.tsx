"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true);
            return;
        }

        // Check if dismissed recently (within 7 days)
        const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
        if (dismissedAt) {
            const dismissedDate = new Date(dismissedAt);
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) {
                return;
            }
        }

        // Detect iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isInStandaloneMode = ("standalone" in window.navigator) && (window.navigator as any).standalone;

        if (isIOS && !isInStandaloneMode) {
            // Show iOS install instructions after a delay
            setTimeout(() => setShowIOSPrompt(true), 3000);
            return;
        }

        // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(() => setShowInstallPrompt(true), 2000);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Listen for successful installation
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

        if (outcome === "accepted") {
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
        setShowIOSPrompt(false);
        localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString());
    };

    if (isInstalled) return null;

    // iOS Install Prompt
    if (showIOSPrompt) {
        return (
            <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
                <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-green-500/30 shadow-2xl">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                                <Smartphone className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white text-sm">Install Ongea Pesa</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Add to Home Screen for the best experience:
                                </p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-300">
                                    <span className="flex items-center gap-1">
                                        1. Tap <Share className="h-3 w-3" />
                                    </span>
                                    <span>→</span>
                                    <span>&quot;Add to Home Screen&quot;</span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDismiss}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Standard Install Prompt (Chrome, Edge, etc.)
    if (showInstallPrompt && deferredPrompt) {
        return (
            <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
                <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-green-500/30 shadow-2xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                                <Download className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white text-sm">Install Ongea Pesa</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Get quick access from your home screen
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDismiss}
                                    className="text-gray-400 hover:text-white"
                                >
                                    Later
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleInstallClick}
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                >
                                    Install
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
