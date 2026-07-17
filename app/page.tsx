import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCards } from "@/components/dashboard/StatCards";
import { LiveList } from "@/components/dashboard/LiveList";
import { StreamPlayer } from "@/components/dashboard/StreamPlayer";
import { LiveDetails } from "@/components/dashboard/LiveDetails";
import { LiveChat } from "@/components/dashboard/LiveChat";
import { LiveTrend } from "@/components/dashboard/Charts/LiveTrend";
import { TopCategories } from "@/components/dashboard/Charts/TopCategories";
import { PeakHours } from "@/components/dashboard/Charts/PeakHours";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TikTokLiveProvider } from "@/components/dashboard/TikTokLiveProvider";

export default function Home() {
  return (
    <TikTokLiveProvider username="">
      <DashboardLayout>
        <div className="flex flex-col space-y-6">
          {/* Top Stats Row */}
          <StatCards />
          
          {/* Main Grid: 3 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-6">
            {/* Left Column */}
            <div className="h-[800px]">
              <LiveList />
            </div>
            
            {/* Center Column */}
            <div className="h-[800px]">
              <StreamPlayer />
            </div>
            
            {/* Right Column */}
            <div className="h-[800px] flex flex-col space-y-6">
              <div className="flex-1 min-h-0">
                <LiveDetails />
              </div>
              <div className="flex-1 min-h-0">
                <LiveChat />
              </div>
            </div>
          </div>
          
          {/* Bottom Grid: 4 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-12">
            <div className="h-[300px] lg:col-span-1">
              <LiveTrend />
            </div>
            <div className="h-[300px] lg:col-span-1">
              <TopCategories />
            </div>
            <div className="h-[300px] lg:col-span-1">
              <PeakHours />
            </div>
            <div className="h-[300px] lg:col-span-1">
              <RecentActivity />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </TikTokLiveProvider>
  );
}
