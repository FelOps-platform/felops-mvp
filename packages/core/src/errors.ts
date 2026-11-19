export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = 'app_error',
    public readonly status = 400,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'unauthorized', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this workspace') {
    super(message, 'forbidden', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 'not_found', 404)
  }
}

export class SlugTakenError extends AppError {
  constructor(slug: string) {
    super(`Workspace slug "${slug}" is already taken`, 'slug_taken', 409)
  }
}

export class QuotaExceededError extends AppError {
  constructor(
    public readonly limit: number,
    public readonly used: number,
    message = 'Monthly message quota exceeded',
  ) {
    super(message, 'quota_exceeded', 429)
  }
}

export class RateLimitExceededError extends AppError {
  constructor(public readonly retryAfter: number) {
    super('Too many requests', 'rate_limited', 429)
  }
}

export class HumanControlledError extends AppError {
  constructor(message = 'This conversation is handled by a human') {
    super(message, 'human_controlled', 409)
  }
}

export class InviteExpiredError extends AppError {
  constructor(message = 'This invitation has expired or was already accepted') {
    super(message, 'invite_expired', 410)
  }
}
