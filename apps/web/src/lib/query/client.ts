import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  })
}

// Singleton for client-side
let clientQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // server: always create new
    return createQueryClient()
  }
  if (!clientQueryClient) clientQueryClient = createQueryClient()
  return clientQueryClient
}
