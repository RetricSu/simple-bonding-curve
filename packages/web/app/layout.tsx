import './globals.css'

export const metadata = {
  title: 'Simple Bonding Curve',
  description: 'A sample Next.js app in a pnpm monorepo'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
