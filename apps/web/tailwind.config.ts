import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F4F1E8',
        surface: '#FFFFFF',
        border: '#000000',
        accent: '#F2B518',
        'highlight-bg': '#FBE9B8',
        'text-primary': '#0A0A0A',
        'text-secondary': '#6B6B68',
        'fill-primary': '#0A0A0A',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0px',
      },
    },
  },
  plugins: [],
}

export default config
