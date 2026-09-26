/* Lightweight event bus for decoupling modules */
const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
}

export function emit(event, ...args) {
  const arr = listeners.get(event);
  if (arr) arr.forEach(fn => fn(...args));
}