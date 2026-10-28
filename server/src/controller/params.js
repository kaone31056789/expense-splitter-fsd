import { sendError } from '../exception/GlobalExceptionHandler.js';

const WHOLE_NUMBER = /^[+-]?\d+$/;

// Parses a whole-number id, or returns undefined if the text is not one
export function parseId(text) {
  return WHOLE_NUMBER.test(text) ? Number(text) : undefined;
}

/**
 * Registers every :name in the list as a numeric path variable on the router.
 * e.g. /api/groups/abc/balances -> 400 "Invalid value 'abc' for groupId"
 */
export function idParams(router, ...names) {
  for (const name of names) {
    router.param(name, (req, res, next, value) => {
      const id = parseId(value);
      if (id === undefined) {
        return sendError(res, 400, `Invalid value '${value}' for ${name}`);
      }
      req.params[name] = id;
      next();
    });
  }
}
