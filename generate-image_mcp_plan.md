---
name: generate-image MCP
overview: HuggingFace Inference API로 FLUX 모델 이미지를 생성하는 `generate-image` MCP Tool을 추가합니다. 성공 시 image(content)로 base64 PNG를 반환하고, 인증/실패 시 text 에러를 반환합니다.
todos:
  - id: deps
    content: "`package.json`에 `@huggingface/inference` 추가 및 `package-lock.json` 갱신"
    status: pending
  - id: tool-code
    content: "[`src/index.ts`](src/index.ts)에 `InferenceClient` import 및 `generate-image` Tool 등록/로직/에러 처리 구현"
    status: pending
  - id: update-schema
    content: "`generate-image` Tool outputSchema를 text/image discriminatedUnion 형태로 구성"
    status: pending
  - id: build
    content: "`npm run build`으로 TypeScript 컴파일 및 `build/index.js` 갱신"
    status: pending
  - id: smoke-test
    content: "MCP inspector 또는 직접 Tool 호출로 성공/실패 케이스 확인"
    status: pending
isProject: false
---

# generate-image MCP Tool 추가 (HF Inference)

## 목표
- `src/index.ts`에 `server.registerTool('generate-image', ...)` 추가
- `@huggingface/inference`의 `InferenceClient`로 `black-forest-labs/FLUX.1-schnell`(provider: `together`) 텍스트-투-이미지 생성
- 환경변수 `HF_TOKEN` 없으면 텍스트 에러 반환
- 성공 시 생성된 Blob을 base64로 변환 후 `type: 'image'`, `mimeType: 'image/png'`로 반환
- API 호출 실패 시 에러 메시지를 텍스트로 반환

## 사용할 MCP 출력 포맷
- MCP SDK 타입 기준 Image 콘텐츠는 다음 필드를 기대합니다.
  - `type: 'image'`
  - `data: base64 문자열`
  - `mimeType: 'image/png'`
- 실패 시 `type: 'text'`로 텍스트만 반환

## 추가할 의존성
- `package.json`에 `@huggingface/inference` 추가 후 `package-lock.json` 갱신

## 입력 스키마
- `prompt` (필수, `string`)
- `num_inference_steps` (선택, `int`, `1~10`, 기본값 `4`)

## 구현 위치
- [`src/index.ts`](src/index.ts) 상단 import에 `InferenceClient` 추가
- 기존 Tool들(`greet`, `calc`, `geocode`, `weather`) 아래/적절한 위치에 `server.registerTool('generate-image', ...)` 추가

## 동작 로직(핵심)
1. `process.env.HF_TOKEN` 체크
   - 없으면 `content: [{ type: 'text', text: 'HF_TOKEN 환경변수가 필요합니다.' }]` 반환
2. `InferenceClient` 생성
   - `const client = new InferenceClient(process.env.HF_TOKEN);`
3. `client.textToImage()` 호출
   - provider: `together`
   - model: `black-forest-labs/FLUX.1-schnell`
   - inputs: `prompt`
   - parameters: `{ num_inference_steps }`
4. Blob -> base64 변환
   - `const arrayBuffer = await image.arrayBuffer()` (타입 문제 회피 위해 필요 시 `as any` 사용)
   - `const base64 = Buffer.from(arrayBuffer).toString('base64')`
5. 반환
   - 성공: `content: [{ type: 'image', data: base64, mimeType: 'image/png' }]`
   - 실패: `content: [{ type: 'text', text: '이미지 생성 실패: ...' }]`

## 빌드
- `npm run build`로 `build/index.js` 갱신

## (선택) 추가 검증
- `mcp inspector`에서 `generate-image` Tool 호출이 스키마/출력 포맷대로 동작하는지 확인

