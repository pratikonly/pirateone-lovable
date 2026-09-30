export interface LiveChannel {
  id: string;
  name: string;
  category: string;
  logo: string | null;
}

export interface LiveChannelDetail {
  id: string;
  name: string;
  sources: string[];
  drm?: {
    type: 'clearkey';
    keyId: string;
    key: string;
  };
}

export class LiveApiError extends Error {
  constructor(public readonly status: number) {
    super(`Live TV request failed with status ${status}.`);
    this.name = 'LiveApiError';
  }
}

const getApiBase = () => {
  const configuredBase = import.meta.env.VITE_LIVE_API_BASE?.trim();
  if (!configuredBase) {
    throw new Error('Live TV is not configured. Set VITE_LIVE_API_BASE and try again.');
  }
  return configuredBase.replace(/\/+$/, '');
};

const getJson = async (url: string, signal?: AbortSignal, noStore = false): Promise<unknown> => {
  const response = await fetch(url, {
    signal,
    ...(noStore ? { cache: 'no-store' as RequestCache } : {}),
  });

  if (!response.ok) throw new LiveApiError(response.status);
  return response.json();
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? value as Record<string, unknown> : null;

export const fetchLiveChannels = async (signal?: AbortSignal): Promise<LiveChannel[]> => {
  const payload = asRecord(await getJson(`${getApiBase()}/api/public/channels`, signal));
  if (!payload || !Array.isArray(payload.channels)) {
    throw new Error('The Live TV service returned an invalid channel list.');
  }

  return payload.channels.flatMap((item): LiveChannel[] => {
    const channel = asRecord(item);
    if (!channel || (typeof channel.id !== 'string' && typeof channel.id !== 'number') || typeof channel.name !== 'string') {
      return [];
    }

    return [{
      id: String(channel.id),
      name: channel.name,
      category: typeof channel.category === 'string' && channel.category.trim()
        ? channel.category
        : 'Uncategorized',
      logo: typeof channel.logo === 'string' && channel.logo.trim() ? channel.logo : null,
    }];
  });
};

export const fetchLiveChannel = async (
  channelId: string,
  signal?: AbortSignal,
): Promise<LiveChannelDetail> => {
  const encodedId = encodeURIComponent(channelId);
  const payload = asRecord(await getJson(
    `${getApiBase()}/api/public/channels/${encodedId}`,
    signal,
    true,
  ));

  if (!payload) throw new Error('The Live TV service returned invalid channel details.');

  const sources = Array.isArray(payload.sources)
    ? payload.sources.filter((source): source is string => typeof source === 'string' && source.length > 0)
    : [];
  if (sources.length === 0) {
    throw new Error('No playable stream is currently available for this channel.');
  }

  const drmValue = asRecord(payload.drm);
  const drm = drmValue?.type === 'clearkey'
    && typeof drmValue.keyId === 'string'
    && typeof drmValue.key === 'string'
    ? { type: 'clearkey' as const, keyId: drmValue.keyId, key: drmValue.key }
    : undefined;

  return {
    id: typeof payload.id === 'string' || typeof payload.id === 'number'
      ? String(payload.id)
      : channelId,
    name: typeof payload.name === 'string' ? payload.name : '',
    sources,
    ...(drm ? { drm } : {}),
  };
};

export const getLiveApiErrorMessage = (error: unknown): string => {
  if (error instanceof LiveApiError) {
    if (error.status === 404) {
      return 'That channel could not be found (404). It may have been removed.';
    }
    if (error.status === 502) {
      return 'The live stream service is temporarily unavailable (502). Please retry in a moment.';
    }
    if (error.status === 450) {
      return 'The stream source rejected playback (450). This channel may be unavailable or geo-restricted to India; try another channel or retry.';
    }
    return `The Live TV request failed (${error.status}). Please retry.`;
  }

  if (error instanceof TypeError) {
    return 'Unable to reach Live TV. Check your connection and try again.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'The stream could not be loaded. Please retry.';
};