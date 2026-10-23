import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type {
  ActivityMode,
  RouteCacheNavigationComplete,
  RouteCacheNavigationStart,
} from "../types";

type Events = {
  activeChange: [
    {
      pathname: string;
      mode: ActivityMode;
      callback?: () => void;
    },
  ];
  cachedNavigationCancel: [RouteCacheNavigationStart];
  cachedNavigationComplete: [RouteCacheNavigationComplete];
  cachedNavigationStart: [RouteCacheNavigationStart];
};

type EventName = keyof Events;
type EventHandler<TName extends EventName> = (...args: Events[TName]) => void;
type EventBucket = {
  [key in EventName]?: EventHandler<key>;
};
export type EventBuckets = { on?: EventBucket; once?: EventBucket };
type ListenerStore = {
  [key in EventName]: Set<EventHandler<key>>;
};
type HandlerMap = {
  [key in EventName]: EventHandler<key>;
};
type EventBucketName = "on" | "once";

const EVENT_NAMES = [
  "activeChange",
  "cachedNavigationCancel",
  "cachedNavigationComplete",
  "cachedNavigationStart",
] as const satisfies readonly EventName[];

const EVENT_BUCKET_KEYS = ["on", "once"] as const;

class RouterCacheEvent {
  private static instance: RouterCacheEvent;
  private readonly listeners: ListenerStore = {
    activeChange: new Set<EventHandler<"activeChange">>(),
    cachedNavigationCancel: new Set<EventHandler<"cachedNavigationCancel">>(),
    cachedNavigationComplete: new Set<
      EventHandler<"cachedNavigationComplete">
    >(),
    cachedNavigationStart: new Set<EventHandler<"cachedNavigationStart">>(),
  };

  private constructor() {
    /* empty */
  }

  static getInstance() {
    if (!RouterCacheEvent.instance) {
      RouterCacheEvent.instance = new RouterCacheEvent();
    }

    return RouterCacheEvent.instance;
  }

  on<TName extends EventName>(eventName: TName, handler: EventHandler<TName>) {
    this.listeners[eventName].add(handler);
    return this;
  }

  once<TName extends EventName>(
    eventName: TName,
    handler: EventHandler<TName>
  ) {
    const onceHandler: EventHandler<TName> = (...args) => {
      this.off(eventName, onceHandler);
      handler(...args);
    };

    this.listeners[eventName].add(onceHandler);
    return this;
  }

  off<TName extends EventName>(eventName: TName, handler: EventHandler<TName>) {
    this.listeners[eventName].delete(handler);
    return this;
  }

  emit<TName extends EventName>(eventName: TName, ...args: Events[TName]) {
    const handlers = this.listeners[eventName];

    for (const handler of handlers) {
      handler(...args);
    }

    return handlers.size > 0;
  }
}

const instance = RouterCacheEvent.getInstance();

export function useEventListener(events?: EventBuckets) {
  const eventsRef = useRef(events);
  const firedOnceRef = useRef<Set<EventName>>(new Set());

  // Stable wrappers subscribe once per present event and always delegate to
  // the latest handler, so re-renders never re-subscribe or call stale code.
  const [stableHandlers] = useState(() => {
    const invoke = <TName extends EventName>(
      bucket: EventBucketName,
      eventName: TName,
      args: Events[TName]
    ) => {
      const handler = eventsRef.current?.[bucket]?.[eventName];

      if (!handler) {
        return;
      }

      if (bucket === "once") {
        if (firedOnceRef.current.has(eventName)) {
          return;
        }

        firedOnceRef.current.add(eventName);
      }

      handler(...args);
    };

    // The explicit literal keeps each handler keyed to its event type;
    // building this map by iterating EVENT_NAMES would need a cast.
    const createHandlers = (bucket: EventBucketName): HandlerMap => ({
      activeChange: (...args) => {
        invoke(bucket, "activeChange", args);
      },
      cachedNavigationCancel: (...args) => {
        invoke(bucket, "cachedNavigationCancel", args);
      },
      cachedNavigationComplete: (...args) => {
        invoke(bucket, "cachedNavigationComplete", args);
      },
      cachedNavigationStart: (...args) => {
        invoke(bucket, "cachedNavigationStart", args);
      },
    });

    return {
      on: createHandlers("on"),
      once: createHandlers("once"),
    };
  });

  useLayoutEffect(() => {
    eventsRef.current = events;
  });

  // Re-subscribe only when the set of present handlers changes, never when
  // a handler or the events object gets a new identity.
  const subscriptionKey = EVENT_BUCKET_KEYS.flatMap((bucket) =>
    EVENT_NAMES.filter(
      (eventName) => events?.[bucket]?.[eventName] !== undefined
    ).map((eventName) => `${bucket}:${eventName}`)
  ).join(",");

  const subscribePresentHandlers = useCallback(() => {
    const present = new Set(
      subscriptionKey === "" ? [] : subscriptionKey.split(",")
    );
    const cleanups: (() => void)[] = [];

    // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- TName ties the event name to its handler-map entry in the body, which the signature alone cannot express.
    const subscribe = <TName extends EventName>(
      bucket: EventBucketName,
      eventName: TName
    ) => {
      if (!present.has(`${bucket}:${eventName}`)) {
        return;
      }

      if (bucket === "once") {
        firedOnceRef.current.delete(eventName);
      }

      const handler = stableHandlers[bucket][eventName];
      instance.on(eventName, handler);
      cleanups.push(() => {
        instance.off(eventName, handler);
      });
    };

    for (const bucket of EVENT_BUCKET_KEYS) {
      for (const eventName of EVENT_NAMES) {
        subscribe(bucket, eventName);
      }
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [stableHandlers, subscriptionKey]);

  // Subscribe in the layout phase so events emitted by a parent layout
  // effect during mount are not missed. Unsubscribe only from the passive
  // effect: hiding a route destroys its layout effects in the same commit
  // where the cache manager emits `activeChange` from its own layout
  // effect, and the hidden route must still receive that event. Discarding
  // this cleanup is safe only because both effects subscribe the same
  // stable handlers and `instance.on` stores them in a Set, so the passive
  // subscription deduplicates them and its cleanup removes them.
  useLayoutEffect(() => {
    subscribePresentHandlers();
  }, [subscribePresentHandlers]);

  useEffect(subscribePresentHandlers, [subscribePresentHandlers]);

  return {
    eventListener: instance,
  };
}
