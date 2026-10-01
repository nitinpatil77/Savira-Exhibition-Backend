// Minimal timestamped logger. Output goes to stdout/stderr and is collected by PM2.
// Never pass passwords, tokens or SMTP credentials to these functions.
const write = (level, stream) => (message) => {
  stream.write(`${new Date().toISOString()} [${level}] ${message}\n`);
};

const logger = {
  info: write('INFO', process.stdout),
  warn: write('WARN', process.stderr),
  error: write('ERROR', process.stderr),
};

export default logger;
