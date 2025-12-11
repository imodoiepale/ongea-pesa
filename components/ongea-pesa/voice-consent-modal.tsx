'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Shield, FileText } from 'lucide-react';

interface VoiceConsentModalProps {
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

const CONSENT_STORAGE_KEY = 'ongea-pesa-voice-consent';

export function VoiceConsentModal({ isOpen, onAccept, onDecline }: VoiceConsentModalProps) {
    const [hasReadTerms, setHasReadTerms] = useState(false);
    const [hasAgreedToRecording, setHasAgreedToRecording] = useState(false);

    const canProceed = hasReadTerms && hasAgreedToRecording;

    const handleAccept = () => {
        // Store consent in localStorage
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
            accepted: true,
            timestamp: new Date().toISOString(),
            version: '1.0'
        }));
        onAccept();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onDecline()}>
            <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 border-green-500/30">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-green-500/20">
                            <Mic className="h-6 w-6 text-green-400" />
                        </div>
                        <DialogTitle className="text-xl text-white">
                            Voice AI Terms & Conditions
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-gray-300">
                        Please review and accept the terms before using Ongea Pesa Voice AI
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[300px] pr-4">
                    <div className="space-y-4 text-sm text-gray-300">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                            <Shield className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-white mb-1">Recording & Processing</h4>
                                <p>
                                    By using the Ongea Pesa Voice AI, you consent to the <strong>recording,
                                        storage, and processing</strong> of your voice communications for
                                    transaction processing and service improvement.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                            <FileText className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-white mb-1">Third-Party Sharing</h4>
                                <p>
                                    Your communications may be shared with third-party service providers
                                    (ElevenLabs, M-Pesa, payment processors) necessary for service operation,
                                    as described in our{' '}
                                    <a href="/privacy-policy" className="text-green-400 hover:underline">
                                        Privacy Policy
                                    </a>.
                                </p>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                            <p className="text-yellow-200 text-xs">
                                <strong>Note:</strong> Voice commands constitute valid authorization for
                                financial transactions from your Ongea Pesa wallet. You are responsible
                                for all transactions initiated through voice commands.
                            </p>
                        </div>

                        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                            <p className="text-gray-400 text-xs">
                                If you do not wish to have your conversations recorded, please refrain
                                from using this service. You may continue using other Ongea Pesa features.
                            </p>
                        </div>
                    </div>
                </ScrollArea>

                <div className="space-y-3 pt-4 border-t border-gray-700">
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="terms"
                            checked={hasReadTerms}
                            onCheckedChange={(checked) => setHasReadTerms(checked === true)}
                            className="mt-0.5 border-gray-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                        <label
                            htmlFor="terms"
                            className="text-sm text-gray-300 leading-tight cursor-pointer"
                        >
                            I have read and agree to the{' '}
                            <a href="/terms" className="text-green-400 hover:underline">
                                Terms and Conditions
                            </a>{' '}
                            and{' '}
                            <a href="/privacy-policy" className="text-green-400 hover:underline">
                                Privacy Policy
                            </a>
                        </label>
                    </div>

                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="recording"
                            checked={hasAgreedToRecording}
                            onCheckedChange={(checked) => setHasAgreedToRecording(checked === true)}
                            className="mt-0.5 border-gray-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                        <label
                            htmlFor="recording"
                            className="text-sm text-gray-300 leading-tight cursor-pointer"
                        >
                            I consent to the recording and processing of my voice interactions
                        </label>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={onDecline}
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                        Decline
                    </Button>
                    <Button
                        onClick={handleAccept}
                        disabled={!canProceed}
                        className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Agree & Continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Hook to check if user has already consented
export function useVoiceConsent() {
    const [hasConsented, setHasConsented] = useState<boolean | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (stored) {
            try {
                const consent = JSON.parse(stored);
                setHasConsented(consent.accepted === true);
            } catch {
                setHasConsented(false);
            }
        } else {
            setHasConsented(false);
        }
    }, []);

    const revokeConsent = () => {
        localStorage.removeItem(CONSENT_STORAGE_KEY);
        setHasConsented(false);
    };

    return { hasConsented, revokeConsent };
}
