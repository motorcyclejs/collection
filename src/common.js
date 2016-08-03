import most from 'most';

export function isStream(arg) {
  return !!arg && typeof arg.observe === 'function';
}

export function isSinks(arg) {
  return arg && typeof arg === 'object' && !Array.isArray(arg);
}

export function stub() {
  let fulfill;
  const stream = most.fromPromise(new Promise(resolve => {
    fulfill = resolve;
  })).join();
  stream.fulfill = fulfill;
  return stream;
}

export const placeholderSymbol = Symbol('placeholder');