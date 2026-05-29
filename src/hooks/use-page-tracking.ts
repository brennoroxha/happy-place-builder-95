import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { logPageEvent } from "@/lib/analytics.functions";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem("slimbelly:session");
    if (!id) {
      id =
        (crypto.randomUUID && crypto.randomUUID()) ||
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("slimbelly:session", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Tracks a visit + maintains realtime presence on a given channel.
 * Pass a stable channelName per page (e.g. "presence:home", "presence:checkout").
 */
export function usePageTracking(channelName: string, path: string) {
  const log = useServerFn(logPageEvent);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sessionId = getSessionId();
    const ua = navigator.userAgent.slice(0, 200);

    // log view (fire-and-forget)
    log({ data: { sessionId, path, userAgent: ua } }).catch(() => {});

    // presence channel
    const channel = supabase.channel(channelName, {
      config: { presence: { key: sessionId } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ at: Date.now(), path });
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [channelName, path, log]);
}

/**
 * Subscribes to a presence channel as a read-only observer
 * and returns the current number of unique online sessions.
 */
export function usePresenceCount(channelName: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const channel = supabase.channel(`${channelName}:observer:${Math.random()}`);
    const target = supabase.channel(channelName);

    const updateFromTarget = () => {
      const state = target.presenceState();
      setCount(Object.keys(state).length);
    };

    target
      .on("presence", { event: "sync" }, updateFromTarget)
      .on("presence", { event: "join" }, updateFromTarget)
      .on("presence", { event: "leave" }, updateFromTarget)
      .subscribe();

    return () => {
      supabase.removeChannel(target);
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  return count;
}
