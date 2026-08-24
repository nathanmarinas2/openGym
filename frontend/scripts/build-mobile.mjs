import { spawnSync } from 'node:child_process'

const bin = name => process.platform === 'win32' ? `${name}.cmd` : name
const env = {
  ...process.env,
  VITE_MOBILE: '1',
  VITE_IMG_BASE: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/',
  VITE_GIF_BASE: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/'
}

const run = (command, args, options = {}) => {
  const result = spawnSync(bin(command), args, { stdio: 'inherit', env, shell: process.platform === 'win32', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('vite', ['build'])
run('cap', ['sync'])
