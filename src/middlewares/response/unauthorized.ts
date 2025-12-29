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
  const resMessage = message || 'Unauthorized request.';
  const response: Record<string, unknown> = {
    response: {
      status: ApiStatusMessages.failed,
      message: resMessage,
      timestamp: new Date(),
      data: data ?? null,
    },
  };

  return this.status(401).json(response.response);
}
