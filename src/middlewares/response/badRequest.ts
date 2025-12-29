import { ApiStatusMessages } from '../../utils';
import { Response } from 'express';

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
  const response: Record<string, unknown> = {
    response: {
      status: ApiStatusMessages.failed,
      message: message || 'Bad Request',
      timestamp: new Date(),
      data: data ?? null,
    },
  };
  return this.status(400).json(response.response);
}
