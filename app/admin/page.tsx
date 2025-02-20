import PollyUsageStats from "@/components/common/PollyDashboard";
import PollyUsageDataGrid from "@/components/common/PollyUsageDataGrid";


export default function PollyUsagePage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Page</h1>
      <PollyUsageDataGrid />
    </div>
  );
}