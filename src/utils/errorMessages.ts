interface AppError {
  status?: number
  message?: string
}

export const getErrorMessageKey = (error: AppError | Error | unknown): string => {
  if (!error) return 'errors.generic'

  const status = (error as AppError).status

  if (status === 403) return 'errors.forbidden'
  if (status === 404) return 'errors.notFound'
  if (status && status >= 500) return 'errors.server'

  const message = (error as Error).message ?? ''
  if (message.includes('Network') || message.toLowerCase().includes('network')) {
    return 'errors.noNetwork'
  }

  return 'errors.generic'
}
