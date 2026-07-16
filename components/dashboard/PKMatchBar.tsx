"use client";

import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";

interface PKMatchProps {
  leftScore?: number;
  rightScore?: number;
  leftAvatars?: string[];
  rightAvatars?: string[];
}

export function PKMatchBar({
  leftScore = 1227,
  rightScore = 798,
  leftAvatars = [
    "https://api.dicebear.com/7.x/notionists/svg?seed=user1",
    "https://api.dicebear.com/7.x/notionists/svg?seed=user2",
    "https://api.dicebear.com/7.x/notionists/svg?seed=user3"
  ],
  rightAvatars = [
    "https://api.dicebear.com/7.x/notionists/svg?seed=user4",
    "https://api.dicebear.com/7.x/notionists/svg?seed=user5",
    "https://api.dicebear.com/7.x/notionists/svg?seed=user6"
  ]
}: PKMatchProps) {
  const total = leftScore + rightScore;
  const leftPercentage = total === 0 ? 50 : (leftScore / total) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center pt-2">
      <div className="relative w-full h-8 rounded-full overflow-hidden flex shadow-lg border border-white/20 bg-[#0e1015]">
        {/* Left Side (Pink) */}
        <motion.div 
          className="h-full bg-gradient-to-r from-[#E12B7D] to-[#F14690] flex items-center px-4"
          initial={{ width: '50%' }}
          animate={{ width: `${leftPercentage}%` }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
        >
          <span className="text-white font-black text-lg drop-shadow-md z-10">{leftScore}</span>
        </motion.div>

        {/* Right Side (Blue) */}
        <motion.div 
          className="h-full flex-1 bg-gradient-to-l from-[#50C2E3] to-[#6DE5FF] flex items-center justify-end px-4"
        >
          <span className="text-white font-black text-lg drop-shadow-md z-10">{rightScore}</span>
        </motion.div>

        {/* Center VS effect / Target Reached indicator could go here */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="bg-white/20 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            <span className="text-white font-bold text-xs italic">VS</span>
          </div>
        </div>
      </div>

      {/* Target Reached Badge */}
      <div className="relative -mt-2 z-30">
        <div className="bg-gradient-to-r from-pink-600/90 to-purple-600/90 backdrop-blur-md text-white text-xs font-bold px-4 py-0.5 rounded-full shadow-lg border border-white/10">
          Target reached
        </div>
      </div>

      {/* Avatars */}
      <div className="w-full flex justify-between px-2 mt-1 relative z-10">
        <div className="flex -space-x-2">
          {leftAvatars.map((url, i) => (
            <div key={i} className="relative w-7 h-7 rounded-full border-2 border-[#11131A] bg-zinc-800">
               <img src={url} alt="avatar" className="w-full h-full rounded-full object-cover" />
               <span className="absolute -bottom-1 -right-1 text-[9px] font-bold text-white bg-[#E12B7D] rounded-full w-4 h-4 flex items-center justify-center border border-[#11131A]">
                 {i + 1}
               </span>
            </div>
          ))}
        </div>
        <div className="flex -space-x-2">
          {rightAvatars.map((url, i) => (
            <div key={i} className="relative w-7 h-7 rounded-full border-2 border-[#11131A] bg-zinc-800">
               <img src={url} alt="avatar" className="w-full h-full rounded-full object-cover" />
               <span className="absolute -bottom-1 -right-1 text-[9px] font-bold text-white bg-[#50C2E3] rounded-full w-4 h-4 flex items-center justify-center border border-[#11131A]">
                 {i + 1}
               </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
