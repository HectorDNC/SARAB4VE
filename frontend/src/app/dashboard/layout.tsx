import Sidebar from "@/components/layout/dashboard/Sidebar";
import RequireAuth from "@/components/layout/dashboard/RequireAuth";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RequireAuth  roles={["admin"]}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 px-5 lg:px-8 pt-16 lg:pt-8 pb-6 lg:pb-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </RequireAuth>

  );
}

