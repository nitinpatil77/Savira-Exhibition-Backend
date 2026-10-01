/** An expected error whose message is safe to show to the API client. */
export default class AppError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }
}
