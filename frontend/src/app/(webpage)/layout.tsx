import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import ButtonEmergencyVoice from "@/components/ui/ButtonEmergencyVoice";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <BottomNav />
      <ButtonEmergencyVoice />
    </>
  );
}