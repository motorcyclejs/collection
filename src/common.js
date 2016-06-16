export function isStream(arg) {
  return !!arg && typeof arg.observe === 'function';
}

export function isSinks(arg) {
  return arg && typeof arg === 'object' && !Array.isArray(arg);
}