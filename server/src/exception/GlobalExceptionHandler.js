import { now } from '../entity/now.js';

/**
 * One place that catches errors thrown by ANY controller and turns them into a
 * clean JSON error with the right HTTP status:
 * { "timestamp": "...", "status": 404, "error": "Not Found", "message": "User not found with id 9" }
 */
const REASONS = {
  400: 'Bad Request',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  500: 'Internal Server Error'
};

export function sendError(res, status, message) {
  res.status(status).json({ timestamp: now(), status, error: REASONS[status], message });
}

// 404 - URL does not match any endpoint, e.g. DELETE /api/expenses/ (id missing)
export function noEndpoint(req, res) {
  sendError(res, 404, `No endpoint at ${req.baseUrl}${req.path} - check the URL and the id`);
}

// 405 - right URL, wrong HTTP method (e.g. GET /api/expenses/1)
export function methodNotAllowed(...allowed) {
  return (req, res) => sendError(res, 405, `${req.method} is not supported here. Allowed: [${allowed.join(', ')}]`);
}

// Express knows this is an error handler because it takes 4 arguments
// eslint-disable-next-line no-unused-vars
export function globalExceptionHandler(err, req, res, next) {
  // express.json() could not parse the body
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Request body is missing or is not valid JSON');
  }
  if (err.status && REASONS[err.status]) {
    return sendError(res, err.status, err.message);
  }
  console.error(err);
  return sendError(res, 500, 'Something went wrong on the server');
}
