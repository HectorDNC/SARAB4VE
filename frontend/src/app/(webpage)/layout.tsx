import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import ButtonEmergencyVoice from "@/components/ui/ButtonEmergencyVoice";
import { FabVisibilityProvider } from "@/providers/FabVisibilityProvider";
import { ChatSocketProvider } from "@/providers/ChatSocketProvider";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <FabVisibilityProvider>
      <ChatSocketProvider>
        <Navbar />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <BottomNav />
        <ButtonEmergencyVoice />
      </ChatSocketProvider>
    </FabVisibilityProvider>
  );
}