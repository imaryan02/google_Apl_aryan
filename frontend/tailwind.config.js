/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#060913",
          card: "#0d1326",
          border: "#182542",
          "border-glow": "#243b6b",
          primary: "#00f0ff",     // Glowing cyan
          secondary: "#8b5cf6",   // Glowing purple
          success: "#00ff66",     // Neon green
          warning: "#ffb700",     // High-vis amber
          danger: "#ff0055",      // Critical emergency red
          vip: "#00a2ff",         // VIP tactical blue
          text: "#e2e8f0",
          muted: "#64748b"
        }
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        mono: ["Space Mono", "monospace"],
        orbitron: ["Orbitron", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 10px rgba(0, 240, 255, 0.2)",
        "glow-success": "0 0 10px rgba(0, 255, 102, 0.2)",
        "glow-danger": "0 0 10px rgba(255, 0, 85, 0.2)",
        "glow-warning": "0 0 10px rgba(255, 183, 0, 0.2)",
        "glow-vip": "0 0 10px rgba(0, 162, 255, 0.2)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2s infinite ease-in-out",
        "scanline": "scanline 10s linear infinite",
        "flicker": "flicker 0.15s infinite alternate",
        "radar-sweep": "radarSweep 5s linear infinite"
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: 0.4, filter: "brightness(0.8)" },
          "50%": { opacity: 1, filter: "brightness(1.2)" }
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" }
        },
        flicker: {
          "0%": { opacity: 0.96 },
          "100%": { opacity: 1 }
        },
        radarSweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        }
      }
    },
  },
  plugins: [],
}
