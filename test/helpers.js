import util from 'util';
import * as most from 'most';


if(!console.inspect) {
  console.inspect = (...args) => console.log(...args.map(arg => util.inspect(arg, false, 10, true)));
}

export {isStream} from '../src/common';

export function periodic(t, x) {
  return most
    .just(x)
    .delay(t)
    .continueWith(() => periodic(t, x));
}

export function counter(prefix = null, t = 1, initial = 0) {
  const i$ = periodic(t).scan(i => i + 1, initial);
  return prefix ? i$.map(i => `${prefix}${i}`) : i$;
}
