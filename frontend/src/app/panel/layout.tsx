import PanelSidebar from "@/components/layout/panel/PanelSidebar";
import RequireAuth from "@/components/layout/dashboard/RequireAuth";

// Panel exclusivo para voluntarios y organizaciones — separado del panel
// administrativo (/dashboard), que sigue siendo solo para admin.
export default function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RequireAuth roles={["organization", "volunteer"]}>
      <div className="flex min-h-screen bg-background">
        <PanelSidebar />
        <main className="flex-1 px-5 lg:px-8 pt-16 lg:pt-8 pb-6 lg:pb-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
