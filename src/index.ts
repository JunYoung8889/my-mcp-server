import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { InferenceClient } from '@huggingface/inference'

// 서버 인스턴스 생성
const server = new McpServer({
    name: 'my-mcp-server',
    version: '1.0.0'
})

server.registerTool(
    'greet',
    {
        description: '이름과 언어를 입력하면 인사말을 반환합니다.',
        inputSchema: z.object({
            name: z.string().describe('인사할 사람의 이름'),
            language: z
                .enum(['ko', 'en'])
                .optional()
                .default('en')
                .describe('인사 언어 (기본값: en)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('인사말')
                    })
                )
                .describe('인사말')
        })
    },
    async ({ name, language }) => {
        const greeting =
            language === 'ko'
                ? `안녕하세요, ${name}님!`
                : `Hey there, ${name}! 👋 Nice to meet you!`

        return {
            content: [
                {
                    type: 'text' as const,
                    text: greeting
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: greeting
                    }
                ]
            }
        }
    }
)

server.registerTool(
    'calc',
    {
        description: '두 숫자와 연산자를 입력하면 계산 결과를 반환합니다.',
        inputSchema: z.object({
            a: z.number().describe('첫 번째 숫자'),
            b: z.number().describe('두 번째 숫자'),
            operator: z
                .enum(['+', '-', '*', '/'])
                .describe('연산자: + (더하기), - (빼기), * (곱하기), / (나누기)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('계산 결과')
                    })
                )
                .describe('계산 결과')
        })
    },
    async ({ a, b, operator }) => {
        let result: number

        // 나누기 0 예외 처리
        if (operator === '/' && b === 0) {
            const text = '오류: 0으로 나눌 수 없습니다.'
            return {
                content: [{ type: 'text' as const, text }],
                structuredContent: { content: [{ type: 'text' as const, text }] }
            }
        }

        switch (operator) {
            case '+': result = a + b; break
            case '-': result = a - b; break
            case '*': result = a * b; break
            case '/': result = a / b; break
        }

        const text = `${a} ${operator} ${b} = ${result!}`
        return {
            content: [{ type: 'text' as const, text }],
            structuredContent: { content: [{ type: 'text' as const, text }] }
        }
    }
)

server.registerTool(
    'geocode',
    {
        description: '도시 이름을 입력하면 위도와 경도 좌표를 반환합니다.',
        inputSchema: z.object({
            city: z.string().describe('좌표를 조회할 도시 이름 (한국어 또는 영어)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('좌표 정보')
                    })
                )
                .describe('좌표 정보')
        })
    },
    async ({ city }) => {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`
        const res = await fetch(url, {
            headers: { 'User-Agent': 'my-mcp-server/1.0.0' }
        })
        const data = (await res.json()) as Array<{
            lat: string
            lon: string
            display_name: string
        }>

        let text: string
        if (data.length === 0) {
            text = `'${city}'에 대한 좌표를 찾을 수 없습니다.`
        } else {
            const { lat, lon, display_name } = data[0]
            text = `${display_name}\n위도: ${lat}\n경도: ${lon}`
        }

        return {
            content: [{ type: 'text' as const, text }],
            structuredContent: { content: [{ type: 'text' as const, text }] }
        }
    }
)

server.registerTool(
    'weather',
    {
        description: '위도와 경도를 입력하면 현재 날씨와 오늘의 시간별 기온을 반환합니다.',
        inputSchema: z.object({
            latitude:  z.number().describe('위도 (예: 37.5665)'),
            longitude: z.number().describe('경도 (예: 126.9780)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('날씨 정보')
                    })
                )
                .describe('날씨 정보')
        })
    },
    async ({ latitude, longitude }) => {
        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude}&longitude=${longitude}` +
            `&current_weather=true&hourly=temperature_2m&forecast_days=1`

        const res  = await fetch(url)
        const data = (await res.json()) as {
            current_weather: {
                temperature: number
                windspeed:   number
                weathercode: number
            }
            hourly: {
                time:           string[]
                temperature_2m: number[]
            }
        }

        const { temperature, windspeed, weathercode } = data.current_weather
        const hourlyLines = data.hourly.time.map((t, i) => {
            // "2026-04-02T13:00" → "13:00"
            const hour = t.split('T')[1]
            return `  ${hour} → ${data.hourly.temperature_2m[i]}°C`
        })

        const text =
            `현재 날씨 (${latitude}°N, ${longitude}°E)\n` +
            `온도: ${temperature}°C\n` +
            `풍속: ${windspeed} km/h\n` +
            `날씨 코드: ${weathercode}\n\n` +
            `오늘의 시간별 기온:\n` +
            hourlyLines.join('\n')

        return {
            content: [{ type: 'text' as const, text }],
            structuredContent: { content: [{ type: 'text' as const, text }] }
        }
    }
)

server.registerTool(
    'generate-image',
    {
        description:
            '프롬프트를 입력하면 HuggingFace Inference API로 이미지를 생성해 반환합니다. HF_TOKEN이 필요합니다.',
        inputSchema: z.object({
            prompt: z.string().describe('이미지 생성 프롬프트'),
            num_inference_steps: z
                .number()
                .int()
                .min(1)
                .max(10)
                .optional()
                .default(4)
                .describe('추론 스텝 수 (1~10)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.discriminatedUnion('type', [
                        z.object({
                            type: z.literal('text'),
                            text: z
                                .string()
                                .describe('이미지 생성 실패 시 에러 메시지 또는 설명 텍스트')
                        }),
                        z.object({
                            type: z.literal('image'),
                            data: z.string().describe('base64 이미지 데이터'),
                            mimeType: z.literal('image/png')
                        })
                    ])
                )
                .describe('이미지 또는 텍스트 결과')
        })
    },
    async ({ prompt, num_inference_steps }) => {
        const token = process.env.HF_TOKEN
        if (!token) {
            const text = 'HF_TOKEN 환경변수가 필요합니다.'
            return {
                content: [{ type: 'text' as const, text }],
                structuredContent: { content: [{ type: 'text' as const, text }] }
            }
        }

        try {
            const client = new InferenceClient(token)
            const image = await client.textToImage({
                provider: 'together',
                model: 'black-forest-labs/FLUX.1-schnell',
                inputs: prompt,
                parameters: { num_inference_steps }
            } as any)

            const imageAny = image as any
            let arrayBuffer: ArrayBufferLike
            if (typeof imageAny?.arrayBuffer === 'function') {
                arrayBuffer = await imageAny.arrayBuffer()
            } else if (imageAny instanceof ArrayBuffer) {
                arrayBuffer = imageAny
            } else if (imageAny instanceof Uint8Array) {
                arrayBuffer = imageAny.buffer
            } else {
                throw new Error('지원하지 않는 이미지 응답 타입입니다.')
            }

            const base64 = Buffer.from(arrayBuffer as ArrayBuffer).toString('base64')
            const content = [
                { type: 'image' as const, data: base64, mimeType: 'image/png' as const }
            ]

            return {
                content,
                structuredContent: { content }
            }
        } catch (err) {
            const message =
                err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
            const text = `이미지 생성 실패: ${message}`
            return {
                content: [{ type: 'text' as const, text }],
                structuredContent: { content: [{ type: 'text' as const, text }] }
            }
        }
    }
)

// 서버 시작 시각 기록
const SERVER_START_TIME = new Date()

server.registerResource(
    'server-info',
    'mcp://server/info',
    {
        description: '현재 MCP 서버의 상태 및 등록된 도구 목록을 반환합니다.',
        mimeType: 'application/json'
    },
    async (uri) => {
        const info = {
            name: 'my-mcp-server',
            version: '1.0.0',
            startedAt: SERVER_START_TIME.toISOString(),
            uptime: Math.floor(process.uptime()),
            nodeVersion: process.version,
            platform: process.platform,
            tools: [
                { name: 'greet',   description: '이름과 언어를 입력하면 인사말을 반환합니다.' },
                { name: 'calc',    description: '두 숫자와 연산자를 입력하면 계산 결과를 반환합니다.' },
                { name: 'geocode', description: '도시 이름을 입력하면 위도와 경도 좌표를 반환합니다.' },
                { name: 'weather', description: '위도와 경도를 입력하면 현재 날씨와 오늘의 시간별 기온을 반환합니다.' },
                { name: 'generate-image', description: '프롬프트를 입력하면 이미지를 생성해 base64 PNG로 반환합니다.' }
            ]
        }
        return {
            contents: [{
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(info, null, 2)
            }]
        }
    }
)

server.registerPrompt(
    'code-review',
    {
        description: '코드를 입력하면 리뷰 요청 프롬프트를 생성합니다.',
        argsSchema: {
            code: z.string().describe('리뷰할 코드'),
            language: z.string().optional().describe('프로그래밍 언어 (예: TypeScript, Python)')
        }
    },
    ({ code, language }) => {
        const langLabel = language ? `${language} ` : ''
        const codeBlock = language
            ? `\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``
            : `\`\`\`\n${code}\n\`\`\``

        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text:
                            `다음 ${langLabel}코드를 리뷰해 주세요.\n\n` +
                            `${codeBlock}\n\n` +
                            `아래 항목을 중점적으로 검토해 주세요:\n` +
                            `1. 버그 및 잠재적 오류\n` +
                            `2. 코드 품질 및 가독성\n` +
                            `3. 성능 개선 사항\n` +
                            `4. 보안 취약점\n` +
                            `5. 전반적인 개선 제안`
                    }
                }
            ]
        }
    }
)

server
    .connect(new StdioServerTransport())
    .catch(console.error)
    .then(() => {
        console.log('MCP server started')
    })
