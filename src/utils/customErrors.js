class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = statusCode.toString().startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
    
      Error.captureStackTrace(this, this.constructor);
    }
  }
    
  class BadRequestError extends AppError {
    constructor(message) {
      super(message, 400);
    }
  }
    
  class NotFoundError extends AppError {
    constructor(message) {
      super(message, 404);
    }
  }
    
  class UnauthorizedError extends AppError {
    constructor(message) {
      super(message, 401);
    }
  }
  
  class ForbiddenError extends AppError {
    constructor(message) {
      super(message, 403);
    }
  }
    
  class RateLimitError extends AppError {
    constructor(message, retryAfter) {
      super(message, 429);
      this.retryAfter = retryAfter;
    }
  }
  
  class ExternalServiceAPIError extends AppError {
    constructor(message, statusCode, details) {
      super(message, statusCode);
      this.details = details;
    }
  }
  
  class ValidationError extends AppError {
    constructor(message, details) {
      super(message, 422);
      this.details = details;
    }
  }
    
  export { 
    AppError, 
    BadRequestError, 
    NotFoundError, 
    UnauthorizedError, 
    RateLimitError, 
    ExternalServiceAPIError, 
    ForbiddenError, 
    ValidationError 
  };