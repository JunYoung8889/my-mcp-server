import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
    title: 'My MCP Server',
    description: 'Vercel에 배포되는 HTTP MCP 서버입니다.'
}

type RootLayoutProps = {
    children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    )
}
