/**
 * Onboarding step indicator.
 *
 * `total` is a parameter rather than a hardcoded 3 because the flow gained a
 * fourth step (first-send). Defaulting it to 3 would let a caller silently show
 * the wrong denominator, so it is required.
 */
export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="onboarding-progress" aria-label={`${step} of ${total}`}>
      <svg viewBox="0 0 180 32" aria-hidden="true">
        <path d="M6 27 C46 2 134 2 174 27" />
        <circle cx="6" cy="27" r="4" />
        <circle cx="174" cy="27" r="4" />
      </svg>
      <span>
        {step} of {total}
      </span>
    </div>
  )
}
