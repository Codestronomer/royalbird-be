import { Response } from 'express';
import ApiError from '../utils/errors';
import { Service } from 'typedi';
import { ExpressErrorMiddlewareInterface, Middleware } from 'routing-controllers';

@Service()
export class AppErrorHandler implements ExpressErrorMiddlewareInterface {
  constructor() {}

  error(err: any, req: any, res: Response, next: (err?: any) => any): void {
    const status = err instanceof ApiError ? err.statusCode : (err.httpCode || 500);

    if (err.errors && this.isClassValidatorErrors(err.errors)) {
      const formattedErrors = this.formatValidationErrors(err.errors);
      res.status(400).json({
        success: false,
        message: 'Invalid Request Parameters',
        errors: formattedErrors
      });
    }

    res.status(status).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  }

  private isClassValidatorErrors(err: any) {
    if (!Array.isArray(err)) {
      return false;
    }

    if (err.length === 0) {
      return false;
    }

    const firstElement = err[0];
    return (
      typeof firstElement === 'object' &&
      firstElement !== null &&
      'property' in firstElement &&
      'constraints' in firstElement
    );
  }

  private formatValidationErrors(errors: any): string[] {
    const formattedErrors: string[] = [];

    errors.forEach((error) => {
      if (error.constraints) {
        Object.values(error.constraints).forEach((message) => {
          formattedErrors.push(`${error.property}: ${message}`);
        });
      }

      if (error.children && error.children.length > 0) {
        const childErrors = this.formatValidationErrors(error.children);
        childErrors.forEach((message) => {
          formattedErrors.push(`${error.property}.${message}`);
        });
      }
    });

    return formattedErrors;
  }
}
