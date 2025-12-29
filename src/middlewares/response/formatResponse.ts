import { Request, Response, NextFunction } from 'express';
import { formatResponse } from './utils';

export default function (req: Request, res: Response, next: NextFunction) {
  const default_data = res.json;
  res.json = (data) => {
    if (data) {
      data = formatResponse(data);
      default_data.call(res, data);
    }
    return data;
  };
  next();
}
