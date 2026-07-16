"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { motion } from "framer-motion";
import { useTikTokLive } from "@/components/dashboard/TikTokLiveProvider";
import { useRef, useState, type FormEvent } from "react";

export function TopBar() {
  const { setActiveUsername } = useTikTokLive();
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const cleanUsername = searchValue.replace('@', '').trim();
    if (!cleanUsername) return;

    setActiveUsername(cleanUsername);
    setSearchValue("");
    setSearchResult(`@${cleanUsername}`);
    window.setTimeout(() => setSearchResult(null), 4000);
  };

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-lg flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex-1 max-w-md relative">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setSearchResult(null);
              }}
              placeholder="Search accounts... (e.g. tiktokindonesia)"
              className="w-full h-10 pl-10 pr-12 bg-panel-hover/50 border border-border/50 rounded-lg text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-chart-purple/50 focus:border-chart-purple transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-panel px-1.5 font-mono text-[10px] font-medium text-text-muted opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </form>

        {/* Search result dropdown */}
        {searchResult && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#171923] border border-border/50 rounded-lg p-3 shadow-xl z-50">
            <p className="text-xs text-text-muted">
              Loading TikTok&apos;s official LIVE embed for <span className="text-[#00F2FE] font-semibold">{searchResult}</span>. TikTok displays the current availability in the player.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative text-text-muted hover:text-white transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-brand-primary rounded-full border-2 border-background"></span>
        </motion.button>

        <div className="flex items-center space-x-3 cursor-pointer hover:bg-white/5 p-1.5 rounded-lg transition-colors">
          <Avatar
            src="https://api.dicebear.com/7.x/notionists/svg?seed=Admin"
            alt="Admin User"
          />
          <div className="flex items-center">
            <span className="text-sm font-medium mr-1">Admin</span>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </div>
        </div>
      </div>
    </header>
  );
}
