"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { API_URL, api } from "./api";

type Listener = () => void;

interface LiveContextValue {
  subscribe: (fn: Listener) => () => void;
  connected: boolean;
}

const LiveContext = createContext<LiveContextValue | null>(null);

// API'nin /events SSE akışına tek bağlantı açar; her olayda abone olan ekranlar veriyi yeniler
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const listeners = useRef(new Set<Listener>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`${API_URL}/events`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener("update", () => {
      clearTimeout(timer);
      timer = setTimeout(() => listeners.current.forEach((fn) => fn()), 120);
    });
    return () => {
      clearTimeout(timer);
      source.close();
    };
  }, []);

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return <LiveContext.Provider value={{ subscribe, connected }}>{children}</LiveContext.Provider>;
}

export function useLiveStatus() {
  return useContext(LiveContext)?.connected ?? false;
}

export function useLive<T>(path: string | null) {
  const ctx = useContext(LiveContext);
  const [state, setState] = useState<{ path: string | null; data?: T; error?: string }>({ path });

  const load = useCallback(async () => {
    if (!path) return;
    try {
      const data = await api<T>(path);
      setState({ path, data });
    } catch (e) {
      setState((s) => ({ path, data: s.path === path ? s.data : undefined, error: (e as Error).message }));
    }
  }, [path]);

  useEffect(() => {
    void load();
    return ctx?.subscribe(() => void load());
  }, [ctx, load]);

  const current = state.path === path;
  return { data: current ? state.data : undefined, error: current ? state.error : undefined, reload: load };
}

// Saniyede bir yeniden çizim için; canlı sayaçlar kullanır
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
