export interface EnrollResult {
  profileBuf: Buffer;    // raw Eagle voiceprint binary (will be encrypted before storage)
  sampleCount: number;
}

export interface VoiceBiometricProvider {
  enroll(pcmFrames: Int16Array[]): Promise<EnrollResult>;
  score(profileBuf: Buffer, pcmFrames: Int16Array[]): Promise<number>;
  readonly threshold: number;
  readonly provider: 'eagle' | 'passphrase';
}

// ─── Eagle Provider ────────────────────────────────────────────────────────

class EagleProvider implements VoiceBiometricProvider {
  readonly threshold = 0.5; // Eagle score range is 0–1; 0.5 is a reasonable default
  readonly provider = 'eagle' as const;

  async enroll(pcmFrames: Int16Array[]): Promise<EnrollResult> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { EagleProfiler } = require('@picovoice/eagle-node');
    const accessKey = process.env.PICOVOICE_ACCESS_KEY!;
    const profiler = new EagleProfiler(accessKey);
    try {
      let percentage = 0;
      for (const frame of pcmFrames) {
        const result = profiler.enroll(frame);
        percentage = result.percentage;
      }
      if (percentage < 100) {
        throw new Error(`Voice enrollment incomplete (${percentage}%). More audio samples needed.`);
      }
      const profile = profiler.export();
      const profileBuf = Buffer.from(profile.toBytes());
      return { profileBuf, sampleCount: pcmFrames.length };
    } finally {
      profiler.release();
    }
  }

  async score(profileBuf: Buffer, pcmFrames: Int16Array[]): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Eagle, EagleProfile } = require('@picovoice/eagle-node');
    const accessKey = process.env.PICOVOICE_ACCESS_KEY!;
    const profile = EagleProfile.fromBytes(new Uint8Array(profileBuf));
    const eagle = new Eagle(accessKey, [profile]);
    try {
      let maxScore = 0;
      for (const frame of pcmFrames) {
        const scores = eagle.process(frame);
        if (scores[0] > maxScore) maxScore = scores[0];
      }
      return maxScore;
    } finally {
      eagle.release();
    }
  }
}

// ─── Passphrase Fallback Provider ─────────────────────────────────────────

class PassphraseProvider implements VoiceBiometricProvider {
  readonly threshold = 0.9; // passphrase is binary match — 1.0 = correct, 0.0 = wrong
  readonly provider = 'passphrase' as const;

  async enroll(_pcmFrames: Int16Array[]): Promise<EnrollResult> {
    // Passphrase fallback: enrollment is a no-op (challenge-response based)
    // The "profile" is the expected passphrase stored encrypted
    return { profileBuf: Buffer.from('passphrase-enrolled'), sampleCount: 0 };
  }

  async score(_profileBuf: Buffer, _pcmFrames: Int16Array[]): Promise<number> {
    // Without server-side speech-to-text, we cannot score passphrase.
    // Routes should use challenge text + ElevenLabs speech_to_text comparison if needed.
    // Return 0 to force routes to handle passphrase flow differently.
    return 0;
  }
}

// ─── Provider Factory ──────────────────────────────────────────────────────

let _provider: VoiceBiometricProvider | null = null;

export function getVoiceProvider(): VoiceBiometricProvider {
  if (!_provider) {
    _provider = process.env.PICOVOICE_ACCESS_KEY
      ? new EagleProvider()
      : new PassphraseProvider();
  }
  return _provider;
}
