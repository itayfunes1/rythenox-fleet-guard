export const DEVICE_HEARTBEAT_TIMEOUT_MS = 90_000;
export const DEVICE_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseLastSeen(lastSeen: string | null) {
  if (!lastSeen) return Number.NaN;

  return new Date(lastSeen).getTime();
}

export function getDeviceLastSeenAgeMs(lastSeen: string | null, now = Date.now()) {
  const lastSeenMs = parseLastSeen(lastSeen);

  if (Number.isNaN(lastSeenMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, now - lastSeenMs);
}

export function isDeviceResponsive(status: string, lastSeen: string | null, now = Date.now()) {
  return status === "Online" && getDeviceLastSeenAgeMs(lastSeen, now) < DEVICE_HEARTBEAT_TIMEOUT_MS;
}

export function isDeviceVisible(lastSeen: string | null, now = Date.now()) {
  return getDeviceLastSeenAgeMs(lastSeen, now) < DEVICE_VISIBILITY_WINDOW_MS;
}

export function formatLastSeenAge(lastSeen: string | null, now = Date.now()) {
  const ageMs = getDeviceLastSeenAgeMs(lastSeen, now);

  if (!Number.isFinite(ageMs)) {
    return "an unknown time";
  }

  const totalSeconds = Math.floor(ageMs / 1000);

  if (totalSeconds < 5) {
    return "just now";
  }

  if (totalSeconds < 60) {
    return `${totalSeconds}s ago`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes}m ago`;
  }

  const totalHours = Math.floor(totalMinutes / 60);

  if (totalHours < 24) {
    return `${totalHours}h ago`;
  }

  const totalDays = Math.floor(totalHours / 24);
  return `${totalDays}d ago`;
}