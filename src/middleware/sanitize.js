// Removes keys that start with "$" or contain "." from request bodies, so user input
// can never be interpreted as a MongoDB operator (NoSQL injection protection).
// Query strings use Express 5's "simple" parser, which never produces nested objects,
// and controllers read query values only as plain strings.
function strip(value) {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else value[key] = strip(value[key]);
    }
  }
  return value;
}

export default function sanitize(req, _res, next) {
  if (req.body) strip(req.body);
  next();
}
