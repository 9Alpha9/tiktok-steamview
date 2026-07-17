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
  stats: {
    viewers: number;
    likes: number;
    shares: number;
    gifts: number;
    followers: number;
  };
  setStats: (stats: Partial<TikTokLiveContextType["stats"]>) => void;
};

interface TikTokLiveContextType {
  streamerInfo: StreamerInfo;
  activeUsername: string;
  setActiveUsername: (username: string) => void;
  status: "offline" | "connecting" | "live";
  setStatus: (status: "offline" | "connecting" | "live") => void;
  setProfileImage: (url?: string) => void;
  setStreamerDetails: (details: { title?: string; nickname?: string }) => void;
  incrementStats: (stats: Partial<TikTokLiveContextType["stats"]>) => void;
  stats: {
    viewers: number;
    likes: number;
    shares: number;
    gifts: number;
    followers: number;
  };
  setStats: (stats: Partial<TikTokLiveContextType["stats"]>) => void;
  streamUrl: { hls?: string; flv?: string; cover?: string };
  setStreamUrl: (urls: { hls?: string; flv?: string; cover?: string }) => void;
}

function createStreamerInfo(username: string, profileImage?: string): StreamerInfo {
  const cleanUsername = username.replace("@", "").trim();
  return {
    title: "",
    viewers: 0,
    likes: 0,
    avatar: profileImage || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(cleanUsername)}`,
    username: `@${cleanUsername}`,
    nickname: cleanUsername,
    status: "live",
    stats: {
      viewers: 0,
      likes: 0,
      shares: 0,
      gifts: 0,
      followers: 0,
    },
    setStats: () => {},
  };
}

const defaultStreamerInfo = createStreamerInfo("username");

const TikTokLiveContext = createContext<TikTokLiveContextType>({
  streamerInfo: defaultStreamerInfo,
  activeUsername: "",
  setActiveUsername: () => {},
  status: "connecting",
  setStatus: () => {},
  setProfileImage: () => {},
  setStreamerDetails: () => {},
  incrementStats: () => {},
  stats: { viewers: 0, likes: 0, shares: 0, gifts: 0, followers: 0 },
  setStats: () => {},
  streamUrl: {},
  setStreamUrl: () => {},
});

export const useTikTokLive = () => useContext(TikTokLiveContext);

export function TikTokLiveProvider({ username: initialUsername, children }: { username: string; children: React.ReactNode }) {
  const [activeUsername, setActiveUsernameRaw] = useState(initialUsername);
  const [status, setStatus] = useState<"offline" | "connecting" | "live">("connecting");
  const [stats, setStatsState] = useState({
    viewers: 0,
    likes: 0,
    shares: 0,
    gifts: 0,
    followers: 0,
  });
  const [profileImage, setProfileImage] = useState<string | undefined>();
  const [customInfo, setCustomInfo] = useState<{ title?: string; nickname?: string }>({});
  const [streamUrl, setStreamUrlState] = useState<{ hls?: string; flv?: string; cover?: string }>({});

  const setStats = React.useCallback((newStats: Partial<typeof stats>) => {
    setStatsState(prev => ({ ...prev, ...newStats }));
  }, []);

  const incrementStats = React.useCallback((increments: Partial<typeof stats>) => {
    setStatsState(prev => ({
      ...prev,
      viewers: prev.viewers + (increments.viewers || 0),
      likes: prev.likes + (increments.likes || 0),
      shares: prev.shares + (increments.shares || 0),
      gifts: prev.gifts + (increments.gifts || 0),
      followers: prev.followers + (increments.followers || 0),
    }));
  }, []);

  const setActiveUsername = React.useCallback((username: string) => {
    const cleanUsername = username.replace("@", "").trim();
    if (cleanUsername) {
      setActiveUsernameRaw(cleanUsername);
      setStatus("connecting");
      setProfileImage(undefined);
      setCustomInfo({});
      setStreamUrlState({});
      setStatsState({ viewers: 0, likes: 0, shares: 0, gifts: 0, followers: 0 });
    }
  }, []);

  const setStreamerDetails = React.useCallback((details: { title?: string; nickname?: string }) => {
    setCustomInfo((prev) => ({ ...prev, ...details }));
  }, []);

  const setStreamUrl = React.useCallback((urls: { hls?: string; flv?: string; cover?: string }) => {
    setStreamUrlState(urls);
  }, []);

  const streamerInfo = useMemo(() => {
    const base = createStreamerInfo(activeUsername, profileImage);
    if (customInfo.title) base.title = customInfo.title;
    if (customInfo.nickname) base.nickname = customInfo.nickname;
    return base;
  }, [activeUsername, profileImage, customInfo]);
  const value = useMemo(
    () => ({
        activeUsername,
        setActiveUsername,
        streamerInfo,
        status,
        setStatus,
        setProfileImage,
        setStreamerDetails,
        setStreamUrl,
        incrementStats,
        stats,
        setStats,
        streamUrl,
      }),
    [streamerInfo, activeUsername, setActiveUsername, status, stats, setStatus, setProfileImage, setStreamerDetails, setStreamUrl, incrementStats, setStats, streamUrl],
  );

  return <TikTokLiveContext.Provider value={value}>{children}</TikTokLiveContext.Provider>;
}
