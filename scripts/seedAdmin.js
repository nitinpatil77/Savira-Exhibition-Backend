// Creates the first admin user (or resets the password of an existing one).
// Usage: npm run seed:admin
import readline from 'node:readline';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Admin from '../src/models/Admin.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const interactive = Boolean(process.stdin.isTTY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: interactive });

// Hide typed characters while entering passwords.
let muted = false;
rl._writeToOutput = (text) => {
  if (!muted) rl.output.write(text);
  else if (text.includes('\n') || text.includes('\r')) rl.output.write('\n');
};

// Queue input lines so answers piped in all at once are not lost.
const lines = [];
const waiting = [];
let inputClosed = false;
rl.on('line', (line) => (waiting.length ? waiting.shift().resolve(line) : lines.push(line)));
rl.on('close', () => {
  inputClosed = true;
  waiting.splice(0).forEach(({ reject }) => reject(new Error('Input ended before all answers were given')));
});

function nextLine() {
  if (lines.length) return Promise.resolve(lines.shift());
  if (inputClosed) return Promise.reject(new Error('Input ended before all answers were given'));
  return new Promise((resolve, reject) => waiting.push({ resolve, reject }));
}

async function ask(question, { hidden = false } = {}) {
  process.stdout.write(question);
  muted = hidden && interactive;
  try {
    const answer = (await nextLine()).trim();
    if (!interactive) process.stdout.write(hidden ? '\n' : `${answer}\n`);
    return answer;
  } finally {
    muted = false;
  }
}

async function askUntilValid(question, validate, options) {
  for (;;) {
    const answer = await ask(question, options);
    const error = validate(answer);
    if (!error) return answer;
    console.log(`  ${error}`);
  }
}

async function main() {
  console.log('\nSavira Systek - create admin user\n');

  const name = await askUntilValid('Admin Name: ', (v) => (v.length >= 2 ? null : 'Name must be at least 2 characters'));
  const email = (
    await askUntilValid('Admin Email: ', (v) => (EMAIL_REGEX.test(v) ? null : 'Please enter a valid email'))
  ).toLowerCase();
  const password = await askUntilValid(
    'Admin Password (min 8 chars): ',
    (v) => (v.length >= 8 ? null : 'Password must be at least 8 characters'),
    { hidden: true },
  );
  const confirm = await ask('Confirm Password: ', { hidden: true });
  if (password !== confirm) throw new Error('Passwords do not match');

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });

  const existing = await Admin.findOne({ email });
  if (existing) {
    const answer = await ask(`An admin with ${email} already exists. Update name and password? (y/N): `);
    if (answer.toLowerCase() !== 'y') {
      console.log('No changes made.');
      return;
    }
    existing.name = name;
    existing.password = password; // hashed by the model's pre-save hook
    await existing.save();
    console.log(`\nAdmin ${email} updated.`);
  } else {
    await Admin.create({ name, email, password }); // hashed by the model's pre-save hook
    console.log(`\nAdmin ${email} created.`);
  }
}

main()
  .catch((err) => {
    console.error(`\nError: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  });
