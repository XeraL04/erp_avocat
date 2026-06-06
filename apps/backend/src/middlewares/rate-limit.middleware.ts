import rateLimit from "express-rate-limit";
import type { Request, Response, RequestHandler } from "express";

const envoyerErreurLimite = (_req: Request, res: Response): void => {
  res.status(429).json({
    success: false,
    message: "Trop de tentatives. Réessayez dans quelques minutes.",
    code: "TROP_DE_REQUETES",
    statusCode: 429,
  });
};

export const authRateLimit: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: envoyerErreurLimite,
});

export const refreshRateLimit: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: envoyerErreurLimite,
});

export const apiRateLimit: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: envoyerErreurLimite,
});