import { Response } from 'express';
import { ApiStatusMessages } from '../../utils';

/**
 *
 *
 * @export
 * @param {*} [data]
 * @param {*} [message]
 * @param _status
 * @return {*}  {(Response )}
 */
export default function (this: Response, data?: any, message?: string, _status?: string): Response {
  const resMessage = message || 'Rate limit exceeded, please try again';
  const response: Record<string, unknown> = {
    response: {
      status: ApiStatusMessages.failed,
      message: resMessage,
      timestamp: new Date(),
      data: process.env.NODE_ENV !== 'production' ? data || {} : {},
    },
  };

  return this.status(429).send(response.response);
}
