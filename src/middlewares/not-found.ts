// src/middlewares/not-found.middlewares.ts
import { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({
        success: false,
        message: `Resource not found: ${req.method} ${req.originalUrl}`,
    });
}