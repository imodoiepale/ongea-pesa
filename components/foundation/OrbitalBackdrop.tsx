import { orbitalBackgrounds, type OrbitalBackdropScene } from "./orbital-backgrounds"

type OrbitalBackdropProps = {
  scene: OrbitalBackdropScene
  priority?: boolean
  className?: string
}

export function OrbitalBackdrop({ scene, priority, className = "" }: OrbitalBackdropProps) {
  const background = orbitalBackgrounds[scene]
  const eager = priority ?? background.priority

  const plate = (theme: "light" | "dark") => {
    const sources = background[theme]
    return (
      <picture className={`orbital-backdrop__plate orbital-backdrop__plate--${theme}`}>
        <source srcSet={sources.avif} type="image/avif" />
        <img
          src={sources.webp}
          width={background.width}
          height={background.height}
          alt=""
          role="presentation"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          style={{ objectPosition: background.focalPosition }}
        />
      </picture>
    )
  }

  return (
    <div
      className={`orbital-backdrop ${className}`}
      data-scene={scene}
      aria-hidden="true"
      style={{
        "--orbital-scrim-light": background.lightScrim,
        "--orbital-scrim-dark": background.darkScrim,
      } as React.CSSProperties}
    >
      {plate("light")}
      {plate("dark")}
      <span className="orbital-backdrop__scrim" />
    </div>
  )
}
