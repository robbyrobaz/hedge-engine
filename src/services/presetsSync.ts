import type { Preset } from '../types';

const OWNER = 'robbyrobaz';
const REPO  = 'hedge-engine';
const FILE  = 'presets.json';
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string | undefined;

const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

// Cache the file SHA between reads/writes — required by the GitHub Contents API
// to avoid "409 Conflict" when updating an existing file.
let _sha: string | null = null;

function authHeaders(): Record<string, string> {
  return TOKEN ? { Authorization: `token ${TOKEN}` } : {};
}

/** Fetch the shared presets from the repo. Returns [] on any error. */
export async function fetchSharedPresets(): Promise<Preset[]> {
  try {
    const res = await fetch(API_URL, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json() as { sha: string; content: string };
    _sha = data.sha;
    const json = atob(data.content.replace(/\s/g, ''));
    return JSON.parse(json) as Preset[];
  } catch {
    return [];
  }
}

/** Write the full presets array to the repo. No-op if no token is configured. */
export async function writeSharedPresets(presets: Preset[]): Promise<void> {
  if (!TOKEN) return;

  // Need the current SHA before writing — fetch if we don't have it yet.
  if (!_sha) {
    await fetchSharedPresets();
  }

  const content = btoa(JSON.stringify(presets, null, 2));
  const body: Record<string, unknown> = {
    message: 'chore: update shared presets',
    content,
    ...(_sha ? { sha: _sha } : {}),
  };

  try {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      // SHA mismatch — someone else wrote concurrently. Re-fetch SHA and retry.
      _sha = null;
      await writeSharedPresets(presets);
      return;
    }

    if (res.ok) {
      const data = await res.json() as { content: { sha: string } };
      _sha = data.content.sha;
    } else {
      console.error('[presetsSync] write failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[presetsSync] write error:', err);
  }
}
