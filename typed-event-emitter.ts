type EventMap = Record<string, unknown>;
type EventName<E extends EventMap> = string & keyof E;
type WildcardEventName = "*";
type EventNames<E extends EventMap> = EventName<E> | WildcardEventName;

type Listener<E extends EventMap, K extends EventNames<E>> = K extends WildcardEventName
  ? (event: string, payload: unknown) => void
  : (payload: E[K]) => void;

type ListenerMap<E extends EventMap> = Map<EventNames<E>, Set<Listener<E, any>>>;

interface EmitterOptions {
  maxListeners?: number;
}

interface AsyncIteratorOptions {
  signal?: AbortSignal;
}

declare global {
  interface SymbolConstructor {
    readonly asyncIterator: unique symbol;
  }
}

export class TypedEventEmitter<E extends EventMap = EventMap> {
  #listeners: ListenerMap<E> = new Map();
  #maxListeners: number;
  #wildcardListeners: Set<Listener<E, "*">> = new Set();

  constructor(options: EmitterOptions = {}) {
    this.#maxListeners = options.maxListeners ?? 10;
  }

  on<K extends EventNames<E>>(event: K, listener: Listener<E, K>): this {
    if (event === "*") {
      this.#addWildcardListener(listener as Listener<E, "*">);
    } else {
      this.#addListener(event as EventName<E>, listener);
    }
    return this;
  }

  once<K extends EventNames<E>>(event: K, listener: Listener<E, K>): this {
    const onceWrapper = ((...args: any[]) => {
      this.off(event, onceWrapper as Listener<E, K>);
      listener(...args);
    }) as Listener<E, K>;

    return this.on(event, onceWrapper);
  }

  off<K extends EventNames<E>>(event: K, listener: Listener<E, K>): this {
    if (event === "*") {
      this.#wildcardListeners.delete(listener as Listener<E, "*">);
    } else {
      const listeners = this.#listeners.get(event as EventName<E>);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.#listeners.delete(event as EventName<E>);
        }
      }
    }
    return this;
  }

  emit<K extends EventName<E>>(event: K, payload: E[K]): boolean {
    let handled = false;

    const listeners = this.#listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(payload);
        handled = true;
      }
    }

    for (const wildcardListener of this.#wildcardListeners) {
      wildcardListener(event, payload);
      handled = true;
    }

    return handled;
  }

  async emitAsync<K extends EventName<E>>(event: K, payload: E[K]): Promise<boolean> {
    let handled = false;

    const listeners = this.#listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        const result = listener(payload);
        if (result instanceof Promise) {
          await result;
        }
        handled = true;
      }
    }

    for (const wildcardListener of this.#wildcardListeners) {
      const result = wildcardListener(event, payload);
      if (result instanceof Promise) {
        await result;
      }
      handled = true;
    }

    return handled;
  }

  listenerCount(event: EventNames<E>): number {
    if (event === "*") {
      return this.#wildcardListeners.size;
    }
    return this.#listeners.get(event as EventName<E>)?.size ?? 0;
  }

  removeAllListeners(event?: EventNames<E>): this {
    if (event === undefined) {
      this.#listeners.clear();
      this.#wildcardListeners.clear();
    } else if (event === "*") {
      this.#wildcardListeners.clear();
    } else {
      this.#listeners.delete(event as EventName<E>);
    }
    return this;
  }

  setMaxListeners(n: number): this {
    this.#maxListeners = n;
    return this;
  }

  getMaxListeners(): number {
    return this.#maxListeners;
  }

  eventNames(): EventNames<E>[] {
    const names = Array.from(this.#listeners.keys()) as EventNames<E>[];
    if (this.#wildcardListeners.size > 0) {
      names.push("*");
    }
    return names;
  }

  *[Symbol.iterator](): IterableIterator<[EventNames<E>, Listener<E, any>]> {
    for (const [event, listeners] of this.#listeners) {
      for (const listener of listeners) {
        yield [event, listener];
      }
    }
    for (const listener of this.#wildcardListeners) {
      yield ["*", listener];
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<[EventNames<E>, Listener<E, any>]> {
    for (const [event, listeners] of this.#listeners) {
      for (const listener of listeners) {
        yield [event, listener];
      }
    }
    for (const listener of this.#wildcardListeners) {
      yield ["*", listener];
    }
  }

  onEvent<K extends EventName<E>>(
    event: K,
    options?: AsyncIteratorOptions
  ): AsyncIterableIterator<E[K]> {
    const queue: E[K][] = [];
    let resolve: ((value: IteratorResult<E[K]>) => void) | null = null;
    let done = false;

    const listener = (payload: E[K]) => {
      if (resolve) {
        resolve({ value: payload, done: false });
        resolve = null;
      } else {
        queue.push(payload);
      }
    };

    this.on(event, listener);

    const cleanup = () => {
      this.off(event, listener);
      done = true;
      if (resolve) {
        resolve({ value: undefined as any, done: true });
      }
    };

    if (options?.signal) {
      options.signal.addEventListener("abort", cleanup, { once: true });
    }

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        if (done) {
          return { value: undefined, done: true };
        }
        if (queue.length > 0) {
          return { value: queue.shift()!, done: false };
        }
        return new Promise<IteratorResult<E[K]>>((r) => {
          resolve = r;
        });
      },
      async return() {
        cleanup();
        return { value: undefined, done: true };
      },
      async throw(error) {
        cleanup();
        throw error;
      },
    };
  }

  onAny(options?: AsyncIteratorOptions): AsyncIterableIterator<[string, unknown]> {
    const queue: [string, unknown][] = [];
    let resolve: ((value: IteratorResult<[string, unknown]>) => void) | null = null;
    let done = false;

    const listener = (event: string, payload: unknown) => {
      if (resolve) {
        resolve({ value: [event, payload], done: false });
        resolve = null;
      } else {
        queue.push([event, payload]);
      }
    };

    this.on("*", listener);

    const cleanup = () => {
      this.off("*", listener);
      done = true;
      if (resolve) {
        resolve({ value: undefined as any, done: true });
      }
    };

    if (options?.signal) {
      options.signal.addEventListener("abort", cleanup, { once: true });
    }

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        if (done) {
          return { value: undefined, done: true };
        }
        if (queue.length > 0) {
          return { value: queue.shift()!, done: false };
        }
        return new Promise<IteratorResult<[string, unknown]>>((r) => {
          resolve = r;
        });
      },
      async return() {
        cleanup();
        return { value: undefined, done: true };
      },
      async throw(error) {
        cleanup();
        throw error;
      },
    };
  }

  #addListener<K extends EventName<E>>(event: K, listener: Listener<E, K>): void {
    let listeners = this.#listeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(event, listeners);
    }

    if (listeners.size >= this.#maxListeners) {
      console.warn(
        `Max listeners (${this.#maxListeners}) exceeded for event "${String(event)}".`
      );
    }

    listeners.add(listener);
  }

  #addWildcardListener(listener: Listener<E, "*">): void {
    if (this.#wildcardListeners.size >= this.#maxListeners) {
      console.warn(`Max wildcard listeners (${this.#maxListeners}) exceeded.`);
    }
    this.#wildcardListeners.add(listener);
  }
}

export function createEmitter<E extends EventMap>(): TypedEventEmitter<E> {
  return new TypedEventEmitter<E>();
}

export type { EventMap, EventName, EventNames, Listener, EmitterOptions, AsyncIteratorOptions };