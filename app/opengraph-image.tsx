import { ImageResponse } from "next/og";

export const alt = "Ongea Pesa - Voice-Activated M-Pesa Assistant";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #000000 0%, #1a1a2e 50%, #16213e 100%)",
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                {/* Background Pattern */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        opacity: 0.1,
                        background: `
              radial-gradient(circle at 20% 80%, #22c55e 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 50%)
            `,
                    }}
                />

                {/* Main Content */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                    }}
                >
                    {/* Logo Circle */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 140,
                            height: 140,
                            borderRadius: "70px",
                            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                            marginBottom: 30,
                            boxShadow: "0 20px 60px rgba(34, 197, 94, 0.4)",
                        }}
                    >
                        {/* Mic Icon */}
                        <svg
                            width="70"
                            height="70"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                    </div>

                    {/* App Name */}
                    <div
                        style={{
                            display: "flex",
                            fontSize: 72,
                            fontWeight: 800,
                            color: "white",
                            marginBottom: 16,
                            letterSpacing: "-2px",
                        }}
                    >
                        <span style={{ color: "#22c55e" }}>Ongea</span>
                        <span style={{ marginLeft: 12 }}>Pesa</span>
                    </div>

                    {/* Tagline */}
                    <div
                        style={{
                            display: "flex",
                            fontSize: 28,
                            color: "#94a3b8",
                            marginBottom: 40,
                            textAlign: "center",
                        }}
                    >
                        Kenya&apos;s Fastest Voice-Activated M-Pesa Assistant
                    </div>

                    {/* Features */}
                    <div
                        style={{
                            display: "flex",
                            gap: 40,
                        }}
                    >
                        {[
                            { icon: "🎤", text: "Voice Payments" },
                            { icon: "📷", text: "Scan & Pay" },
                            { icon: "⚡", text: "Instant Transfer" },
                        ].map((feature, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    background: "rgba(255, 255, 255, 0.1)",
                                    padding: "12px 24px",
                                    borderRadius: 50,
                                    gap: 10,
                                }}
                            >
                                <span style={{ fontSize: 24 }}>{feature.icon}</span>
                                <span style={{ fontSize: 18, color: "white" }}>{feature.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Gradient */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        display: "flex",
                        background: "linear-gradient(90deg, #22c55e 0%, #3b82f6 50%, #22c55e 100%)",
                    }}
                />
            </div>
        ),
        {
            ...size,
        }
    );
}
