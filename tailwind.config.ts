import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const ROLES = [
  "verb", "subject", "time", "manner", "place", "negation", "object", "question", "connector", "other",
] as const;

/** role-<name> (soft fill) and role-<name>-edge (border / swatch) colours. */
const roleColors = Object.fromEntries(
  ROLES.flatMap((r) => [
    [`role-${r}`, token(`role-${r}`)],
    [`role-${r}-edge`, token(`role-${r}-edge`)],
  ]),
);

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: token("background"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        border: token("border"),
        text: token("text"),
        "text-muted": token("text-muted"),
        primary: token("primary"),
        "primary-soft": token("primary-soft"),
        "on-primary": token("on-primary"),
        "accent-yellow": token("accent-yellow"),
        "accent-green": token("accent-green"),
        "accent-red": token("accent-red"),
        der: token("der"),
        die: token("die"),
        das: token("das"),
        "der-edge": token("der-edge"),
        "die-edge": token("die-edge"),
        "das-edge": token("das-edge"),
        "on-article": token("on-article"),
        success: token("success"),
        "success-soft": token("success-soft"),
        danger: token("danger"),
        "danger-soft": token("danger-soft"),
        warning: token("warning"),
        "warning-soft": token("warning-soft"),
        ...roleColors,
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"],
        vazir: ["var(--font-vazir)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      spacing: {
        // Fixed-chrome geometry; values live in globals.css so there is a single source.
        nav: "var(--bottom-nav-h)",
        header: "var(--header-h)",
        "action-bar": "var(--action-bar-h)",
        "bottom-chrome": "var(--bottom-chrome-h)",
        feedback: "var(--feedback-min-h)",
        "feedback-sm": "var(--feedback-min-h-sm)",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--shadow) / 0.05), 0 4px 12px rgb(var(--shadow) / 0.06)",
        lift: "0 2px 4px rgb(var(--shadow) / 0.06), 0 10px 24px rgb(var(--shadow) / 0.10), 0 24px 48px rgb(var(--shadow) / 0.06)",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-12px)" },
          "55%": { transform: "translateY(0)" },
          "75%": { transform: "translateY(-4px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(4deg)" },
        },
      },
      animation: {
        pop: "pop 0.5s ease-out",
        shake: "shake 0.35s ease-in-out",
        float: "float 4s ease-in-out infinite",
        "bounce-soft": "bounce-soft 0.7s ease-out",
        wiggle: "wiggle 0.6s ease-in-out 2",
      },
    },
  },
  plugins: [],
};

export default config;
