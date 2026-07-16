"use client";

import { ArrowRight, List } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTikTokLive } from "./TikTokLiveProvider";

const MONITORED_ACCOUNTS = [
  "babyyaurel",
  "riaricis1795",
  "putri.delinaa",
  "ridwanramadhann",
  "dewiestarii",
  "fadiljaidi",
  "bramastavrl",
].map((username) => ({
  username,
  avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`,
}));

export function LiveList() {
  const { activeUsername, setActiveUsername } = useTikTokLive();

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center space-x-2 mb-4">
          <List className="h-4 w-4 text-[#00F2FE]" />
          <h3 className="font-bold">Monitored Accounts</h3>
          <Badge variant="secondary" className="ml-2">{MONITORED_ACCOUNTS.length}</Badge>
        </div>
        <p className="text-xs leading-5 text-text-muted">
          Fixed list — selecting an account loads its official TikTok LIVE embed. No automatic polling or reordering.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {MONITORED_ACCOUNTS.map((account) => {
          const isActive = account.username === activeUsername;
          return (
            <motion.button
              type="button"
              key={account.username}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setActiveUsername(account.username)}
              className={`flex w-full items-center p-3 rounded-lg text-left transition-all ${
                isActive
                  ? "bg-white/5 border border-[#FF0050]/30 shadow-[0_0_10px_rgba(255,0,80,0.1)]"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <Avatar src={account.avatar} />
              <div className="ml-3 flex min-w-0 flex-col">
                <span className="text-sm font-semibold truncate">@{account.username}</span>
                <span className="text-xs text-text-muted truncate">Open official LIVE player</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="p-3 border-t border-border/50">
        <Button variant="ghost" className="w-full text-xs py-2 h-auto text-text-muted hover:text-white bg-white/5">
          Manage monitored accounts <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
