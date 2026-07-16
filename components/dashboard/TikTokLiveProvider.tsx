"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type StreamerInfo = {
  title: string;
  viewers: string | number;
  likes: string | number;
  avatar: string;
  username: string;
  nickname: string;
  status: "offline" | "connecting" | "live";
  category?: string;
  location?: string;
  shares?: number | string;
  gifts?: number | string;
  followerCount?: number | string;
  followingCount?: number | string;
};

interface TikTokLiveContextType {
  streamerInfo: StreamerInfo;
  activeUsername: string;
  setActiveUsername: (username: string) => void;
}

function createStreamerInfo(username: string): StreamerInfo {
  const cleanUsername = username.replace("@", "").trim();
  return {
    title: "Official TikTok LIVE embed",
    viewers: 12400,
    likes: 2100000,
    avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(cleanUsername)}`,
    username: `@${cleanUsername}`,
    nickname: cleanUsername,
    status: "live",
    category: "Gaming",
    location: "Indonesia",
    shares: 1204,
    gifts: 4500,
    followerCount: 850200,
    followingCount: 124,
  };
}

const defaultStreamerInfo = createStreamerInfo("username");

const TikTokLiveContext = createContext<TikTokLiveContextType>({
  streamerInfo: defaultStreamerInfo,
  activeUsername: "",
  setActiveUsername: () => {},
});

export const useTikTokLive = () => useContext(TikTokLiveContext);

export function TikTokLiveProvider({ username: initialUsername, children }: { username: string; children: React.ReactNode }) {
  const [activeUsername, setActiveUsernameRaw] = useState(initialUsername);

  const setActiveUsername = React.useCallback((username: string) => {
    const cleanUsername = username.replace("@", "").trim();
    if (cleanUsername) setActiveUsernameRaw(cleanUsername);
  }, []);

  const streamerInfo = useMemo(() => createStreamerInfo(activeUsername), [activeUsername]);
  const value = useMemo(
    () => ({ streamerInfo, activeUsername, setActiveUsername }),
    [streamerInfo, activeUsername, setActiveUsername],
  );

  return <TikTokLiveContext.Provider value={value}>{children}</TikTokLiveContext.Provider>;
}
