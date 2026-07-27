export function OnboardingProgress({ step }: { step: 1 | 3 }) {
  return (
    <div className="onboarding-progress" aria-label={`${step} of 3`}>
      <svg viewBox="0 0 180 32" aria-hidden="true">
        <path d="M6 27 C46 2 134 2 174 27" />
        <circle cx="6" cy="27" r="4" />
        <circle cx="174" cy="27" r="4" />
      </svg>
      <span>{step} of 3</span>
    </div>
  )
}
