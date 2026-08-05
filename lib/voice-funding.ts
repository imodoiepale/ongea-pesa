export const VOICE_STARTER_AMOUNT = 200
export const VOICE_FUNDING_PURPOSE = "voice_service_funding"
export const VOICE_RATE_PER_MINUTE = 20

export function voiceUsageCharge(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0
  return Math.round((durationSeconds / 60) * VOICE_RATE_PER_MINUTE * 100) / 100
}

export function isVoiceFundingPurpose(value: unknown): value is typeof VOICE_FUNDING_PURPOSE {
  return value === VOICE_FUNDING_PURPOSE
}
