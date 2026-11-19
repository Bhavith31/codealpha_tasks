// Small helper to throw errors that carry an HTTP status code.
module.exports = function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
};
