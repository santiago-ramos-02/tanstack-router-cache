import { useEffect } from "react";
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
type EventBuckets = { on?: EventBucket; once?: EventBucket };
type ListenerStore = {
  [key in EventName]: Set<EventHandler<key>>;
};

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

  private constructor() {}

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

function syncEventHandler<TName extends EventName>(
  type: "on" | "off",
  eventName: TName,
  handler: EventHandler<TName>
) {
  if (type === "on") {
    instance.on(eventName, handler);
    return;
  }

  instance.off(eventName, handler);
}

function syncEventBucket(type: "on" | "off", bucket: EventBucket) {
  if (bucket.activeChange) {
    syncEventHandler(type, "activeChange", bucket.activeChange);
  }

  if (bucket.cachedNavigationCancel) {
    syncEventHandler(
      type,
      "cachedNavigationCancel",
      bucket.cachedNavigationCancel
    );
  }

  if (bucket.cachedNavigationComplete) {
    syncEventHandler(
      type,
      "cachedNavigationComplete",
      bucket.cachedNavigationComplete
    );
  }

  if (bucket.cachedNavigationStart) {
    syncEventHandler(
      type,
      "cachedNavigationStart",
      bucket.cachedNavigationStart
    );
  }
}

function syncEventHandlers(type: "on" | "off", events?: EventBuckets) {
  if (!events) {
    return;
  }

  for (const key of EVENT_BUCKET_KEYS) {
    const bucket = events[key];
    if (!bucket) {
      continue;
    }

    syncEventBucket(type, bucket);
  }
}

export function useEventListener(events?: EventBuckets) {
  useEffect(() => {
    const registerEvent = () => {
      syncEventHandlers("on", events);
      return () => {
        syncEventHandlers("off", events);
      };
    };

    const unregister = registerEvent();

    return () => {
      unregister?.();
    };
  }, [events]);

  return {
    eventListener: instance,
  };
}
