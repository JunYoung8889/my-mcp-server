export default function HomePage() {
    return (
        <main
            style={{
                fontFamily: 'Arial, sans-serif',
                margin: '0 auto',
                maxWidth: '720px',
                padding: '48px 24px',
                lineHeight: 1.6
            }}
        >
            <h1>My MCP Server</h1>
            <p>이 프로젝트는 Vercel에 배포 가능한 HTTP 기반 MCP 서버입니다.</p>
            <p>
                MCP 엔드포인트:
                {' '}
                <code>/api/mcp</code>
            </p>
            <p>
                Cursor에서는 해당 URL을 MCP 서버로 등록하면 도구, 리소스, 프롬프트를 사용할 수
                있습니다.
            </p>
        </main>
    )
}
