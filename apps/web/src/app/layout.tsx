import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JEV Resume Analyzer',
  description: 'Analyze your resume against job descriptions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
