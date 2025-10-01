import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import UploadSection from "@/components/UploadSection";
import ResultsGrid from "@/components/ResultsGrid";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Upload and manage your blood smear analyses
          </p>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <UploadSection />
          </div>
          
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Recent Analyses</h2>
            </div>
            <ResultsGrid />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
