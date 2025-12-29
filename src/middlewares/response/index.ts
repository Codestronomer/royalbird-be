import { Response, Request, NextFunction } from 'express';
import ok from './ok';
import notFound from './notFound';
import badRequest from './badRequest';
import serverError from './serverError';
import unauthorized from './unauthorized';
import tooManyRequests from './toomanyRequest';
import created from './created';

// export default (req: Request, res: Response, next: NextFunction) => {
//   res.ok = ok;
//   res.created = created;
//   res.notFound = notFound;
//   res.badRequest = badRequest;
//   res.serverError = serverError;
//   res.unAuthorized = unauthorized;
//   res.tooManyRequests = tooManyRequests;

//   next();
// };

// src/middlewares/response/index.ts