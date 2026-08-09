/**
 * What the app says when something goes wrong.
 *
 * An error message written for a developer is a gift to an attacker: database
 * errors name hosts and table names, filesystem errors reveal directory layout,
 * and an upstream failure can quote back the internal URL that was called. None
 * of that helps the person looking at the screen, and all of it helps someone
 * mapping the system.
 *
 * So failures are split in two. The full error — stack trace and all — goes to
 * the server log, where operators can find it. The caller gets a fixed phrase
 * and a request id, which is the piece that ties the two together: a user can
 * quote the id in a support request and an operator can look up exactly what
 * happened without either of them seeing the internals.
 */

/**
 * Log an unexpected failure and reply with a safe, generic message.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {unknown} err        the real error — logged, never sent
 * @param {string} event       searchable label for the log line
 * @param {object} [options]
 * @param {number} [options.status=500]
 * @param {string} [options.code="internal_error"]  stable identifier for clients
 * @param {string} [options.message]  human-readable text safe to show
 */
export function sendServerError(req, res, err, event, options = {}) {
  const status = options.status ?? 500;
  const code = options.code ?? "internal_error";
  req.log?.error({ err, event }, event);
  return res.status(status).json({
    error: code,
    message: options.message ?? "The server could not complete this request.",
    request_id: req.id ?? undefined,
  });
}

/**
 * Reply to a request the caller got wrong.
 *
 * Unlike server errors these messages are deliberately specific — the caller
 * needs to know which field was rejected — but the text is always something the
 * route author wrote, never a message produced by a library or the database.
 */
export function sendClientError(res, status, code, message) {
  return res.status(status).json({ error: code, ...(message ? { message } : {}) });
}
