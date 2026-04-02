import { createMcpHandler } from 'mcp-handler'

import {
    MCP_SERVER_NAME,
    MCP_SERVER_VERSION,
    registerMcpFeatures
} from '../../../src/mcp/registerServer'

export const runtime = 'nodejs'
export const maxDuration = 60

const handler = createMcpHandler(
    (server) => {
        registerMcpFeatures(server)
    },
    {
        serverInfo: {
            name: MCP_SERVER_NAME,
            version: MCP_SERVER_VERSION
        }
    },
    {
        basePath: '/api',
        maxDuration,
        verboseLogs: process.env.NODE_ENV !== 'production'
    }
)

export { handler as DELETE, handler as GET, handler as POST }
