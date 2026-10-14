import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted: Record<string, string> = {};
    errors.array().forEach((e) => {
      const field = 'path' in e ? (e.path as string) : 'field';
      formatted[field] = e.msg;
    });
    res.status(400).json({ success: false, message: 'Validation failed', errors: formatted });
    return;
  }
  next();
};
