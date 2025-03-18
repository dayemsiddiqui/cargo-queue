export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
  
  static notFound(message: string): ApiError {
    return new ApiError(message, 404);
  }
  
  static badRequest(message: string): ApiError {
    return new ApiError(message, 400);
  }
  
  static internal(message: string): ApiError {
    return new ApiError(message, 500);
  }
} 