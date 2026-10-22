type EventMap = Record<string, unknown>;

type Listener<T> = (payload: T) => void | Promise<void>;
type WildcardListener<T extends EventMap> = (event: string, payload: T[keyof T]) => void | Promise<void>;

interface Subscription {
  off(): void;
}

type EventNames<T extends EventMap> = string & keyof T;

class TypedEventEmitter<T extends EventMap> {
  private listeners = new Map<string, Set<Listener<unknown>>>();
  private wildcardListeners = new Set<WildcardListener<T>>();
  private onceListeners = new Map<string, Set<Listener<unknown>>>();
  private onceWildcardListeners = new Set<WildcardListener<T>>();

  on<K extends EventNames<T>>(event: K, listener: Listener<T[K]>): Subscription {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as Listener<unknown>);
    this.listeners.set(event, set);

    return {
      off: () => this.off(event, listener),
    };
  }

  once<K extends EventNames<T>>(event: K, listener: Listener<T[K]>): Subscription {
    const set = this.onceListeners.get(event) ?? new Set();
    set.add(listener as Listener<unknown>);
    this.onceListeners.set(event, set);

    return {
      off: () => this.off(event, listener),
    };
  }

  onWildcard(listener: WildcardListener<T>): Subscription {
    this.wildcardListeners.add(listener);
    return {
      off: () => this.wildcardListeners.delete(listener),
    };
  }

  onceWildcard(listener: WildcardListener<T>): Subscription {
    this.onceWildcardListeners.add(listener);
    return {
      off: () => this.onceWildcardListeners.delete(listener),
    };
  }

  off<K extends EventNames<T>>(event: K, listener: Listener<T[K]>): boolean {
    const set = this.listeners.get(event);
    if (!set) return false;

    const deleted = set.delete(listener as Listener<unknown>);
    if (set.size === 0) this.listeners.delete(event);

    const onceSet = this.onceListeners.get(event);
    if (onceSet) {
      onceSet.delete(listener as Listener<unknown>);
      if (onceSet.size === 0) this.onceListeners.delete(event);
    }

    return deleted;
  }

  offWildcard(listener: WildcardListener<T>): boolean {
    return this.wildcardListeners.delete(listener) || this.onceWildcardListeners.delete(listener);
  }

  emit<K extends EventNames<T>>(event: K, payload: T[K]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        const result = listener(payload);
        if (result instanceof Promise) {
          result.catch((err) => {
            setTimeout(() => { throw err; }, 0);
          });
        }
      }
    }

    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      for (const listener of onceListeners) {
        const result = listener(payload);
        if (result instanceof Promise) {
          result.catch((err) => {
            setTimeout(() => { throw err; }, 0);
          });
        }
      }
      this.onceListeners.delete(event);
    }

    for (const listener of this.wildcardListeners) {
      const result = listener(event, payload);
      if (result instanceof Promise) {
        result.catch((err) => {
          setTimeout(() => { throw err; }, 0);
        });
      }
    }

    for (const listener of this.onceWildcardListeners) {
      const result = listener(event, payload);
      if (result instanceof Promise) {
        result.catch((err) => {
          setTimeout(() => { throw err; }, 0);
        });
      }
    }
    this.onceWildcardListeners.clear();
  }

  async *iterate<K extends EventNames<T>>(event: K): AsyncIterableIterator<T[K]> {
    const queue: T[K][] = [];
    let resolve: ((value: IteratorResult<T[K]>) => void) | null = null;
    let closed = false;

    const subscription = this.on(event, (payload) => {
      if (resolve) {
        resolve({ value: payload, done: false });
        resolve = null;
      } else {
        queue.push(payload);
      }
    });

    try {
      while (!closed) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          await new Promise<IteratorResult<T[K]>((r) => { resolve = r; });
        }
      }
    } finally {
      subscription.off();
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
      this.wildcardListeners.clear();
      this.onceWildcardListeners.clear();
    }
  }

  listenerCount(event: string): number {
    return (this.listeners.get(event)?.size ?? 0) + (this.onceListeners.get(event)?.size ?? 0);
  }

  eventNames(): string[] {
    const names = new Set<string>();
    for (const name of this.listeners.keys()) names.add(name);
    for (const name of this.onceListeners.keys()) names.add(name);
    return Array.from(names);
  }
}

export { TypedEventEmitter, type EventMap, type Subscription };