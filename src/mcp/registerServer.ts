import { InferenceClient } from '@huggingface/inference'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export const MCP_SERVER_NAME = 'my-mcp-server'
export const MCP_SERVER_VERSION = '1.0.0'

const SERVER_START_TIME = new Date()

export function registerMcpFeatures(server: McpServer) {
    server.registerTool(
        'greet',
        {
            title: '인사말 생성',
            description: '이름과 언어를 입력하면 인사말을 반환합니다.',
            inputSchema: {
                name: z.string().describe('인사할 사람의 이름'),
                language: z
                    .enum(['ko', 'en'])
                    .optional()
                    .default('en')
                    .describe('인사 언어 (기본값: en)')
            }
        },
        async ({ name, language }) => {
            const greeting =
                language === 'ko'
                    ? `안녕하세요, ${name}님!`
                    : `Hey there, ${name}! Nice to meet you!`

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
            title: '계산기',
            description: '두 숫자와 연산자를 입력하면 계산 결과를 반환합니다.',
            inputSchema: {
                a: z.number().describe('첫 번째 숫자'),
                b: z.number().describe('두 번째 숫자'),
                operator: z
                    .enum(['+', '-', '*', '/'])
                    .describe('연산자: + (더하기), - (빼기), * (곱하기), / (나누기)')
            }
        },
        async ({ a, b, operator }) => {
            let result: number

            if (operator === '/' && b === 0) {
                const text = '오류: 0으로 나눌 수 없습니다.'

                return {
                    content: [{ type: 'text' as const, text }],
                    structuredContent: { content: [{ type: 'text' as const, text }] }
                }
            }

            switch (operator) {
                case '+':
                    result = a + b
                    break
                case '-':
                    result = a - b
                    break
                case '*':
                    result = a * b
                    break
                case '/':
                    result = a / b
                    break
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
            title: '좌표 조회',
            description: '도시 이름을 입력하면 위도와 경도 좌표를 반환합니다.',
            inputSchema: {
                city: z.string().describe('좌표를 조회할 도시 이름 (한국어 또는 영어)')
            }
        },
        async ({ city }) => {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`
            const response = await fetch(url, {
                headers: { 'User-Agent': `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}` }
            })
            const data = (await response.json()) as Array<{
                lat: string
                lon: string
                display_name: string
            }>

            const text =
                data.length === 0
                    ? `'${city}'에 대한 좌표를 찾을 수 없습니다.`
                    : `${data[0].display_name}\n위도: ${data[0].lat}\n경도: ${data[0].lon}`

            return {
                content: [{ type: 'text' as const, text }],
                structuredContent: { content: [{ type: 'text' as const, text }] }
            }
        }
    )

    server.registerTool(
        'weather',
        {
            title: '날씨 조회',
            description: '위도와 경도를 입력하면 현재 날씨와 오늘의 시간별 기온을 반환합니다.',
            inputSchema: {
                latitude: z.number().describe('위도 (예: 37.5665)'),
                longitude: z.number().describe('경도 (예: 126.9780)')
            }
        },
        async ({ latitude, longitude }) => {
            const url =
                `https://api.open-meteo.com/v1/forecast` +
                `?latitude=${latitude}&longitude=${longitude}` +
                `&current_weather=true&hourly=temperature_2m&forecast_days=1`

            const response = await fetch(url)
            const data = (await response.json()) as {
                current_weather: {
                    temperature: number
                    windspeed: number
                    weathercode: number
                }
                hourly: {
                    time: string[]
                    temperature_2m: number[]
                }
            }

            const { temperature, windspeed, weathercode } = data.current_weather
            const hourlyLines = data.hourly.time.map((time, index) => {
                const hour = time.split('T')[1]
                return `  ${hour} -> ${data.hourly.temperature_2m[index]}°C`
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
            title: '이미지 생성',
            description:
                '프롬프트를 입력하면 HuggingFace Inference API로 이미지를 생성해 반환합니다. HF_TOKEN이 필요합니다.',
            inputSchema: {
                prompt: z.string().describe('이미지 생성 프롬프트'),
                num_inference_steps: z
                    .number()
                    .int()
                    .min(1)
                    .max(10)
                    .optional()
                    .default(4)
                    .describe('추론 스텝 수 (1~10)')
            }
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
                } as never)

                const imageLike = image as unknown as
                    | { arrayBuffer: () => Promise<ArrayBuffer> }
                    | ArrayBuffer
                    | Uint8Array

                let imageBuffer: Buffer

                if (typeof (imageLike as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
                    const arrayBuffer = await (
                        imageLike as { arrayBuffer: () => Promise<ArrayBuffer> }
                    ).arrayBuffer()
                    imageBuffer = Buffer.from(arrayBuffer)
                } else if (imageLike instanceof ArrayBuffer) {
                    imageBuffer = Buffer.from(imageLike)
                } else if (imageLike instanceof Uint8Array) {
                    imageBuffer = Buffer.from(imageLike)
                } else {
                    throw new Error('지원하지 않는 이미지 응답 타입입니다.')
                }

                const content = [
                    {
                        type: 'image' as const,
                        data: imageBuffer.toString('base64'),
                        mimeType: 'image/png' as const
                    }
                ]

                return {
                    content,
                    structuredContent: { content }
                }
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : typeof error === 'string'
                          ? error
                          : JSON.stringify(error)
                const text = `이미지 생성 실패: ${message}`

                return {
                    content: [{ type: 'text' as const, text }],
                    structuredContent: { content: [{ type: 'text' as const, text }] }
                }
            }
        }
    )

    server.registerResource(
        'server-info',
        'mcp://server/info',
        {
            description: '현재 MCP 서버의 상태 및 등록된 도구 목록을 반환합니다.',
            mimeType: 'application/json'
        },
        async (uri) => {
            const info = {
                name: MCP_SERVER_NAME,
                version: MCP_SERVER_VERSION,
                startedAt: SERVER_START_TIME.toISOString(),
                uptime: Math.floor(process.uptime()),
                nodeVersion: process.version,
                platform: process.platform,
                tools: [
                    { name: 'greet', description: '이름과 언어를 입력하면 인사말을 반환합니다.' },
                    { name: 'calc', description: '두 숫자와 연산자를 입력하면 계산 결과를 반환합니다.' },
                    { name: 'geocode', description: '도시 이름을 입력하면 위도와 경도 좌표를 반환합니다.' },
                    {
                        name: 'weather',
                        description: '위도와 경도를 입력하면 현재 날씨와 오늘의 시간별 기온을 반환합니다.'
                    },
                    {
                        name: 'generate-image',
                        description: '프롬프트를 입력하면 이미지를 생성해 base64 PNG로 반환합니다.'
                    }
                ]
            }

            return {
                contents: [
                    {
                        uri: uri.href,
                        mimeType: 'application/json',
                        text: JSON.stringify(info, null, 2)
                    }
                ]
            }
        }
    )

    server.registerPrompt(
        'code-review',
        {
            title: '코드 리뷰 요청',
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
}
