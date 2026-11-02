"use client";
// Live updates from the realtime service (docs/adr/0012), shared by the admin and IT apps.
//
// One tab per browser holds the Server-Sent Events connection (Web Locks elect it) and passes every event to the
// other tabs (BroadcastChannel); when it closes, another tab takes over. Browsers without those APIs connect from
// each tab. Without EventSource, the app falls back to resyncing every 30 seconds. After every reconnect the client
// sends a synthetic "realtime.resync" so components fetch what they missed.
import * as React from "react";

export type RealtimeEvent = { type: string; data?: Record<string, unknown> };
export type RealtimeStatus = "connecting" | "open" | "reconnecting" | "offline";
type Listener = (event: RealtimeEvent) => void;

export const RESYNC = "realtime.resync";
const IDLE_AFTER_MS = 5 * 60_000;
const ACTIVITY_THROTTLE_MS = 30_000;

type ChannelMessage =
  | { kind: "event"; event: RealtimeEvent }
  | { kind: "status"; status: RealtimeStatus }
  | { kind: "activity"; at: number }
  | { kind: "hello" };

export type RealtimeOptions = {
  /** The app's same-origin stream route, e.g. /api/realtime/stream. */
  url: string;
  /** Called by the leading tab when everyone's tabs went idle or became active again. */
  onActivity?: (state: "active" | "idle") => void;
};

/** One browser-wide connection, shared by every tab of the app. */
export class RealtimeClient {
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(s: RealtimeStatus) => void>();
  private source: EventSource | null = null;
  private channel: BroadcastChannel | null = null;
  private status: RealtimeStatus = "connecting";
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private releaseLock: (() => void) | null = null;
  private leader = false;
  private stopped = false;
  private everOpened = false;
  private lastActivity = Date.now();
  private lastSentActivity = 0;
  private reportedIdle = false;

  constructor(private options: RealtimeOptions) {}

  start() {
    if (typeof window === "undefined") return;
    this.stopped = false;
    if ("BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(`platform-realtime:${this.options.url}`);
      this.channel.onmessage = (m: MessageEvent<ChannelMessage>) => this.fromChannel(m.data);
      this.channel.postMessage({ kind: "hello" } satisfies ChannelMessage);
    }
    this.watchActivity();
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    if (locks && this.channel) {
      void locks.request(`platform-realtime:${this.options.url}`, () =>
        new Promise<void>((resolve) => {
          this.releaseLock = resolve;
          if (this.stopped) return resolve();
          this.lead();
        }),
      );
    } else {
      this.lead(); // every tab connects on its own
    }
  }

  stop() {
    this.stopped = true;
    this.source?.close();
    this.source = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.idleTimer) clearInterval(this.idleTimer);
    this.channel?.close();
    this.channel = null;
    this.releaseLock?.();
    this.releaseLock = null;
    window.removeEventListener("pointerdown", this.onInput);
    window.removeEventListener("keydown", this.onInput);
    window.removeEventListener("wheel", this.onInput);
    document.removeEventListener("visibilitychange", this.onInput);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onStatus(listener: (s: RealtimeStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  /** True in the tab that holds the connection (it plays sounds and shows desktop notifications). */
  isLeader() {
    return this.leader;
  }

  private emit(event: RealtimeEvent) {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch (error) {
        console.error("realtime listener failed", error);
      }
    }
  }

  private setStatus(status: RealtimeStatus) {
    this.status = status;
    for (const l of Array.from(this.statusListeners)) l(status);
    if (this.leader) this.channel?.postMessage({ kind: "status", status } satisfies ChannelMessage);
  }

  private fromChannel(message: ChannelMessage) {
    if (message.kind === "event" && !this.leader) this.emit(message.event);
    else if (message.kind === "status" && !this.leader) {
      this.status = message.status;
      for (const l of Array.from(this.statusListeners)) l(message.status);
    } else if (message.kind === "activity") this.lastActivity = Math.max(this.lastActivity, message.at);
    else if (message.kind === "hello" && this.leader)
      this.channel?.postMessage({ kind: "status", status: this.status } satisfies ChannelMessage);
  }

  private lead() {
    this.leader = true;
    if (typeof EventSource === "undefined") {
      // Very old browsers: no live stream, but components still refresh regularly.
      this.setStatus("offline");
      this.pollTimer = setInterval(() => this.dispatch({ type: RESYNC }), 30_000);
      return;
    }
    this.connect();
    this.idleTimer = setInterval(() => this.checkIdle(), 15_000);
  }

  private dispatch(event: RealtimeEvent) {
    this.emit(event);
    this.channel?.postMessage({ kind: "event", event } satisfies ChannelMessage);
  }

  private connect() {
    if (this.stopped) return;
    this.setStatus(this.everOpened ? "reconnecting" : "connecting");
    const source = new EventSource(this.options.url);
    this.source = source;
    source.onmessage = (message) => {
      let event: RealtimeEvent;
      try {
        event = JSON.parse(message.data) as RealtimeEvent;
      } catch {
        return;
      }
      if (event.type === "realtime.ready") {
        const resync = this.everOpened;
        this.everOpened = true;
        this.retry = 0;
        this.setStatus("open");
        if (resync) this.dispatch({ type: RESYNC });
        return;
      }
      if (event.type === "realtime.reconnect" || event.type === "realtime.closed") return; // the browser reconnects
      this.dispatch(event);
    };
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        // An error status (signed out, server restarting): EventSource gives up, so retry with back-off.
        source.close();
        this.setStatus("reconnecting");
        const wait = Math.min(1000 * 2 ** this.retry++, 60_000) + Math.random() * 1000;
        this.retryTimer = setTimeout(() => this.connect(), wait);
      } else if (this.status === "open") {
        this.setStatus("reconnecting");
      }
    };
  }

  private onInput = () => {
    if (document.visibilityState === "hidden") return;
    const now = Date.now();
    this.lastActivity = now;
    if (this.reportedIdle && this.leader) this.checkIdle();
    if (now - this.lastSentActivity > ACTIVITY_THROTTLE_MS) {
      this.lastSentActivity = now;
      this.channel?.postMessage({ kind: "activity", at: now } satisfies ChannelMessage);
    }
  };

  private watchActivity() {
    window.addEventListener("pointerdown", this.onInput, { passive: true });
    window.addEventListener("keydown", this.onInput);
    window.addEventListener("wheel", this.onInput, { passive: true });
    document.addEventListener("visibilitychange", this.onInput);
  }

  private checkIdle() {
    const idle = Date.now() - this.lastActivity > IDLE_AFTER_MS;
    if (idle !== this.reportedIdle) {
      this.reportedIdle = idle;
      this.options.onActivity?.(idle ? "idle" : "active");
    }
  }
}

const RealtimeContext = React.createContext<RealtimeClient | null>(null);

/** Holds the browser's live connection for everything below it. */
export function RealtimeProvider({ url, onActivity, children }: RealtimeOptions & { children: React.ReactNode }) {
  const [client, setClient] = React.useState<RealtimeClient | null>(null);
  const activity = React.useRef(onActivity);
  React.useEffect(() => {
    activity.current = onActivity;
  }, [onActivity]);
  React.useEffect(() => {
    const next = new RealtimeClient({ url, onActivity: (state) => activity.current?.(state) });
    next.start();
    setClient(next);
    return () => next.stop();
  }, [url]);
  return <RealtimeContext.Provider value={client}>{children}</RealtimeContext.Provider>;
}

/** The shared client (null before it starts, and outside a provider). */
export const useRealtimeClient = () => React.useContext(RealtimeContext);

/** Calls handler for live events of the given types (all when omitted), and for resyncs after a reconnect. */
export function useRealtime(handler: (event: RealtimeEvent) => void, types?: readonly string[]) {
  const client = useRealtimeClient();
  const saved = React.useRef(handler);
  React.useEffect(() => {
    saved.current = handler;
  }, [handler]);
  const key = types?.join("|") ?? "";
  React.useEffect(() => {
    if (!client) return;
    const wanted = key ? key.split("|") : null;
    return client.subscribe((event) => {
      if (!wanted || event.type === RESYNC || wanted.includes(event.type)) saved.current(event);
    });
  }, [client, key]);
}

/** The connection's state, for an indicator. */
export function useRealtimeStatus(): RealtimeStatus {
  const client = useRealtimeClient();
  const [status, setStatus] = React.useState<RealtimeStatus>("connecting");
  React.useEffect(() => {
    if (!client) return;
    const off = client.onStatus(setStatus);
    return () => {
      off();
    };
  }, [client]);
  return status;
}
