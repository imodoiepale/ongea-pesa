"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WifiOff, RefreshCw, Home } from "lucide-react";

export default function OfflinePage() {
    const handleRetry = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        window.location.href = "/";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-card/50 border-border/60">
                <CardContent className="p-8 text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                        <WifiOff className="h-10 w-10 text-red-400" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-white mb-2">You&apos;re Offline</h1>

                    {/* Description */}
                    <p className="text-muted-foreground mb-6">
                        It looks like you&apos;ve lost your internet connection. Some features may not be
                        available until you&apos;re back online.
                    </p>

                    {/* Status indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span>No internet connection</span>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Button
                            onClick={handleRetry}
                            className="w-full"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>

                        <Button
                            onClick={handleGoHome}
                            variant="outline"
                            className="w-full border-border/60 text-foreground hover:bg-muted"
                        >
                            <Home className="h-4 w-4 mr-2" />
                            Go to Home
                        </Button>
                    </div>

                    {/* Tip */}
                    <div className="mt-8 p-4 rounded-lg bg-muted/50 text-left">
                        <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">Tip:</strong> Ongea Pesa works best with an
                            internet connection. Voice commands and payments require connectivity.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
