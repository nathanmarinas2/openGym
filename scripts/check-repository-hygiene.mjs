import { execFileSync } from 'node:child_process';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const forbidden = tracked.filter(file => {
  const normalized = file.replaceAll('\\', '/');
  const runtimeData = normalized.startsWith('data/') && normalized !== 'data/.gitkeep';
  const osFile = normalized === '.DS_Store' || normalized.endsWith('/.DS_Store');
  const envFile = /(^|\/)\.env(?:\..+)?$/.test(normalized) && !normalized.endsWith('.env.example');
  return runtimeData || osFile || envFile;
});

if (forbidden.length) {
  console.error('Repository hygiene check failed. Runtime/secrets files must not be tracked:');
  for (const file of forbidden) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`Repository hygiene check passed (${tracked.length} tracked files).`);
