import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

async function git(repo: string, args: string[]): Promise<{ stdout: string; ok: boolean }> {
  try {
    const { stdout } = await exec('git', args, {
      cwd: repo,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, ok: true };
  } catch {
    return { stdout: '', ok: false };
  }
}

export async function commitExists(repo: string, sha: string): Promise<boolean> {
  const { ok } = await git(repo, ['rev-parse', '--verify', `${sha}^{commit}`]);
  return ok;
}

export async function commitByMessage(repo: string, fragment: string): Promise<string[]> {
  const { stdout, ok } = await git(repo, ['log', '--all', '--oneline', `--grep=${fragment}`]);
  if (!ok) return [];
  return stdout.split('\n').filter(Boolean);
}

export async function pathExistsAtRef(repo: string, ref: string, path: string): Promise<boolean> {
  const { ok } = await git(repo, ['cat-file', '-e', `${ref}:${path}`]);
  return ok;
}

export async function prExists(repo: string, prNumber: number): Promise<boolean> {
  const hits = await commitByMessage(repo, `(#${prNumber})`);
  return hits.length > 0;
}
