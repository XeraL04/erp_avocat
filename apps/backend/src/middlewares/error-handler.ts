import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/api-response';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Erreur de validation Zod
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    sendError(res, message, 'VALIDATION_ERROR', 422);
    return;
  }

  // Erreur applicative métier
  if (err instanceof AppError) {
    sendError(res, err.message, err.code, err.statusCode);
    return;
  }

  // Erreur Mongoose - document dupliqué
  if ((err as any).code === 11000) {
    sendError(res, 'Cette valeur existe déjà', 'DUPLICATE_ERROR', 409);
    return;
  }

  // Erreur inconnue
  console.error('Erreur non gérée :', err);
  sendError(res, 'Erreur serveur interne', 'INTERNAL_ERROR', 500);
};
