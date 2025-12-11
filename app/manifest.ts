import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Ongea Pesa",
        short_name: "OngeaPesa",
        description:
            "Kenya's fastest voice-activated M-Pesa assistant. Pay bills, send money, and manage finances with just your voice.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#22c55e",
        orientation: "portrait",
        scope: "/",
        lang: "en",
        dir: "ltr",
        categories: ["finance", "utilities", "productivity"],
        icons: [
            {
                src: "/icons/icon-48x48.png",
                sizes: "48x48",
                type: "image/png",
            },
            {
                src: "/icons/icon-72x72.png",
                sizes: "72x72",
                type: "image/png",
            },
            {
                src: "/icons/icon-96x96.png",
                sizes: "96x96",
                type: "image/png",
            },
            {
                src: "/icons/icon-128x128.png",
                sizes: "128x128",
                type: "image/png",
            },
            {
                src: "/icons/icon-144x144.png",
                sizes: "144x144",
                type: "image/png",
            },
            {
                src: "/icons/icon-152x152.png",
                sizes: "152x152",
                type: "image/png",
            },
            {
                src: "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-256x256.png",
                sizes: "256x256",
                type: "image/png",
            },
            {
                src: "/icons/icon-384x384.png",
                sizes: "384x384",
                type: "image/png",
            },
            {
                src: "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
        screenshots: [
            {
                src: "/screenshots/screenshot-1.png",
                sizes: "1080x1920",
                type: "image/png",
                // @ts-ignore - form_factor is valid but not in types
                form_factor: "narrow",
                label: "Ongea Pesa Dashboard",
            },
            {
                src: "/screenshots/screenshot-2.png",
                sizes: "1080x1920",
                type: "image/png",
                // @ts-ignore
                form_factor: "narrow",
                label: "Voice Payment Scanner",
            },
        ],
        shortcuts: [
            {
                name: "Scan & Pay",
                short_name: "Scan",
                description: "Open camera to scan payment codes",
                url: "/dashboard?screen=scanner",
                icons: [{ src: "/icons/scan-icon.png", sizes: "96x96" }],
            },
            {
                name: "Send Money",
                short_name: "Send",
                description: "Send money to contacts",
                url: "/dashboard?screen=send",
                icons: [{ src: "/icons/send-icon.png", sizes: "96x96" }],
            },
            {
                name: "Voice Assistant",
                short_name: "Voice",
                description: "Talk to Ongea Pesa",
                url: "/dashboard?screen=voice",
                icons: [{ src: "/icons/voice-icon.png", sizes: "96x96" }],
            },
        ],
        related_applications: [],
        prefer_related_applications: false,
    };
}
