'use client'

import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'

export function LandingThemeProvider({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

export function useLandingTheme() {
  return useTheme()
}
