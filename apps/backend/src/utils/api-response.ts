import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    // Permet des champs custom : totalPaye, devise, etc.
    [key: string]: unknown;
  };
}

interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  statusCode: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: SuccessResponse<T>['meta']
): Response => {
  const response: SuccessResponse<T> = { success: true, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  code: string,
  statusCode = 500
): Response => {
  const response: ErrorResponse = { success: false, message, code, statusCode };
  return res.status(statusCode).json(response);
};
