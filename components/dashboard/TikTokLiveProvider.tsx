"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";

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
  lastGift: { username: string; avatarUrl: string; giftName: string; giftIcon: string; count: number; id: string; diamondCount: number; giftType: number; isCombo: boolean } | null;
  setLastGift: (gift: TikTokLiveContextType["lastGift"]) => void;
  lastLike: { username: string; count: number; id: string } | null;
  setLastLike: (like: TikTokLiveContextType["lastLike"]) => void;
  battleOpponents: { username: string; avatarUrl: string; nickname?: string }[];
  setBattleOpponents: (opponents: TikTokLiveContextType["battleOpponents"]) => void;
  goal: GoalData | null;
  setGoal: (goal: GoalData | null) => void;
  topContributors: Contributor[];
  addContribution: (username: string, avatarUrl: string, giftName: string, giftCount: number, diamondCount: number) => void;
  recentActivity: ActivityEvent[];
  setRecentActivity: React.Dispatch<React.SetStateAction<ActivityEvent[]>>;
  ranks: RankEntry[];
  setRanks: React.Dispatch<React.SetStateAction<RankEntry[]>>;
  polls: PollData[];
  setPolls: React.Dispatch<React.SetStateAction<PollData[]>>;
  captions: CaptionData[];
  setCaptions: React.Dispatch<React.SetStateAction<CaptionData[]>>;
  superFans: SuperFanData[];
  setSuperFans: React.Dispatch<React.SetStateAction<SuperFanData[]>>;
  envelopes: EnvelopeData[];
  setEnvelopes: React.Dispatch<React.SetStateAction<EnvelopeData[]>>;
  questions: QuestionData[];
  setQuestions: React.Dispatch<React.SetStateAction<QuestionData[]>>;
}

export type Contributor = {
  username: string;
  avatarUrl: string;
  totalGifts: number;
  totalDiamonds: number;
};

export type ActivityEvent = {
  id: string;
  type: "gift" | "like" | "follow" | "share" | "super_fan" | "envelope";
  username: string;
  avatarUrl: string;
  detail: string;
  timestamp: number;
};

export type RankEntry = {
  rank: number;
  username: string;
  avatarUrl: string;
  score: number;
  nickname?: string;
};

export type PollData = {
  id: string;
  question: string;
  options: { id: string; text: string; voteCount: number; votePercentage: number }[];
  status: string;
  startTime: number;
  endTime: number;
};

export type CaptionData = {
  text: string;
  timestamp: number;
};

export type SuperFanData = {
  username: string;
  avatarUrl: string;
  nickname: string;
  timestamp: number;
};

export type EnvelopeData = {
  id: string;
  senderName: string;
  senderAvatar: string;
  diamondCount: number;
  timestamp: number;
};

export type QuestionData = {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  timestamp: number;
};

export type GoalData = {
  id: string;
  description: string;
  status: number;
  challengeType: string;
  subGoals: {
    id: string;
    type: number;
    progress: number;
    target: number;
    giftName: string;
    giftIcon: string;
    diamondCount: number;
  }[];
  contributors: {
    userId: string;
    displayId: string;
    avatarUrl: string;
    score: number;
  }[];
  stats: {
    totalCoins: number;
    totalContributor: number;
  };
};

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
  lastGift: null,
  setLastGift: () => {},
  lastLike: null,
  setLastLike: () => {},
  battleOpponents: [],
  setBattleOpponents: () => {},
  goal: null,
  setGoal: () => {},
  topContributors: [],
  addContribution: () => {},
  recentActivity: [],
  setRecentActivity: () => {},
  ranks: [],
  setRanks: (() => {}) as React.Dispatch<React.SetStateAction<RankEntry[]>>,
  polls: [],
  setPolls: (() => {}) as React.Dispatch<React.SetStateAction<PollData[]>>,
  captions: [],
  setCaptions: (() => {}) as React.Dispatch<React.SetStateAction<CaptionData[]>>,
  superFans: [],
  setSuperFans: (() => {}) as React.Dispatch<React.SetStateAction<SuperFanData[]>>,
  envelopes: [],
  setEnvelopes: (() => {}) as React.Dispatch<React.SetStateAction<EnvelopeData[]>>,
  questions: [],
  setQuestions: (() => {}) as React.Dispatch<React.SetStateAction<QuestionData[]>>,
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
  const [lastGift, setLastGiftState] = useState<TikTokLiveContextType["lastGift"]>(null);
  const [lastLike, setLastLikeState] = useState<TikTokLiveContextType["lastLike"]>(null);
  const [battleOpponents, setBattleOpponents] = useState<TikTokLiveContextType["battleOpponents"]>([]);
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [topContributors, setTopContributors] = useState<Contributor[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [ranks, setRanks] = useState<RankEntry[]>([]);
  const [polls, setPolls] = useState<PollData[]>([]);
  const [captions, setCaptions] = useState<CaptionData[]>([]);
  const [superFans, setSuperFans] = useState<SuperFanData[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeData[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const recentIdsRef = useRef(new Set<string>());

  // Auto-clear gift overlay after a few seconds
  useEffect(() => {
     if (lastGift) {
       const isBigGift = lastGift.giftType === 2 && !lastGift.isCombo;
       const timer = setTimeout(() => {
          setLastGiftState(null);
       }, isBigGift ? 6000 : 4000);
       return () => clearTimeout(timer);
     }
  }, [lastGift]);

  // Auto-clear like overlay after a short moment
  useEffect(() => {
     if (lastLike) {
       const timer = setTimeout(() => {
          setLastLikeState(null);
       }, 1500); // Like animation is shorter
       return () => clearTimeout(timer);
     }
  }, [lastLike]);

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
      setLastGiftState(null);
      setLastLikeState(null);
      setBattleOpponents([]);
      setGoal(null);
      setTopContributors([]);
      setRecentActivity([]);
      setRanks([]);
      setPolls([]);
      setCaptions([]);
      setSuperFans([]);
      setEnvelopes([]);
      setQuestions([]);
    }
  }, []);

  const setStreamerDetails = React.useCallback((details: { title?: string; nickname?: string }) => {
    setCustomInfo((prev) => ({ ...prev, ...details }));
  }, []);

  const setStreamUrl = React.useCallback((urls: { hls?: string; flv?: string; cover?: string }) => {
    setStreamUrlState(urls);
  }, []);

  const addContribution = React.useCallback((username: string, avatarUrl: string, giftName: string, giftCount: number, diamondCount: number) => {
    const dedupeKey = `${username}-${giftName}-${giftCount}-${Math.floor(Date.now() / 2000)}`;
    if (recentIdsRef.current.has(dedupeKey)) return;
    recentIdsRef.current.add(dedupeKey);
    if (recentIdsRef.current.size > 100) {
      const first = recentIdsRef.current.values().next().value;
      if (first) recentIdsRef.current.delete(first);
    }

    setTopContributors(prev => {
      const existing = prev.find(c => c.username === username);
      if (existing) {
        return prev.map(c => c.username === username
          ? { ...c, totalGifts: c.totalGifts + giftCount, totalDiamonds: c.totalDiamonds + diamondCount }
          : c
        ).sort((a, b) => b.totalDiamonds - a.totalDiamonds).slice(0, 20);
      }
      return [...prev, { username, avatarUrl, totalGifts: giftCount, totalDiamonds: diamondCount }]
        .sort((a, b) => b.totalDiamonds - a.totalDiamonds).slice(0, 20);
    });

    setRecentActivity(prev => {
      const event: ActivityEvent = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "gift",
        username,
        avatarUrl,
        detail: `${giftName} x${giftCount}`,
        timestamp: Date.now(),
      };
      return [event, ...prev].slice(0, 30);
    });
  }, []);

  React.useEffect(() => {
    const handleReconnect = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.username && customEvent.detail.username === activeUsername) {
        // Use setActiveUsername to properly clear streamUrlState and other states
        setActiveUsername("");
        setTimeout(() => {
          setActiveUsername(customEvent.detail.username);
        }, 100);
      }
    };

    window.addEventListener('tiktok-reconnect', handleReconnect);
    return () => window.removeEventListener('tiktok-reconnect', handleReconnect);
  }, [activeUsername, setActiveUsername]);

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
        lastGift,
        setLastGift: setLastGiftState,
        lastLike,
        setLastLike: setLastLikeState,
        battleOpponents,
        setBattleOpponents,
        goal,
        setGoal,
        topContributors,
        addContribution,
        recentActivity,
        setRecentActivity,
        ranks,
        setRanks,
        polls,
        setPolls,
        captions,
        setCaptions,
        superFans,
        setSuperFans,
        envelopes,
        setEnvelopes,
        questions,
        setQuestions,
      }),
    [streamerInfo, activeUsername, setActiveUsername, status, stats, setStatus, setProfileImage, setStreamerDetails, setStreamUrl, incrementStats, setStats, streamUrl, lastGift, setLastGiftState, lastLike, setLastLikeState, battleOpponents, setBattleOpponents, goal, setGoal, topContributors, addContribution, recentActivity, setRecentActivity, ranks, polls, captions, superFans, envelopes, questions],
  );

  return <TikTokLiveContext.Provider value={value}>{children}</TikTokLiveContext.Provider>;
}
