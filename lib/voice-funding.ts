export const VOICE_STARTER_AMOUNT = 200
export const VOICE_FUNDING_PURPOSE = "voice_service_funding"

export function isVoiceFundingPurpose(value: unknown): value is typeof VOICE_FUNDING_PURPOSE {
  return value === VOICE_FUNDING_PURPOSE
}
