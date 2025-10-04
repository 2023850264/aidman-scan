import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import UploadSection from "@/components/UploadSection";
import ResultsGrid from "@/components/ResultsGrid";
import { Loader2, Activity, FileText, TrendingUp, Microscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUploads: 0,
    positiveResults: 0,
    pendingAnalysis: 0,
    recentReports: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const [uploadsRes, reportsRes] = await Promise.all([
        supabase.from("uploads").select("*", { count: "exact" }),
        supabase.from("reports").select("*", { count: "exact" })
      ]);

      const uploads = uploadsRes.data || [];
      const positiveCount = uploads.filter(u => u.diagnosis_result === "positive").length;
      const pendingCount = uploads.filter(u => u.status === "pending" || u.status === "processing").length;

      setStats({
        totalUploads: uploads.length,
        positiveResults: positiveCount,
        pendingAnalysis: pendingCount,
        recentReports: reportsRes.count || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

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

  const statCards = [
    {
      title: "Total Analyses",
      value: stats.totalUploads,
      icon: Microscope,
      gradient: "from-primary to-accent",
      delay: "0ms"
    },
    {
      title: "Positive Results",
      value: stats.positiveResults,
      icon: Activity,
      gradient: "from-destructive to-warning",
      delay: "100ms"
    },
    {
      title: "Pending Analysis",
      value: stats.pendingAnalysis,
      icon: TrendingUp,
      gradient: "from-warning to-accent",
      delay: "200ms"
    },
    {
      title: "Generated Reports",
      value: stats.recentReports,
      icon: FileText,
      gradient: "from-success to-primary",
      delay: "300ms"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Header with animation */}
        <div className="mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload and manage your blood smear analyses
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.title}
              className="hover-lift border-none shadow-lg animate-in fade-in slide-in-from-bottom"
              style={{ animationDelay: stat.delay, animationDuration: "700ms" }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent" 
                       style={{ backgroundImage: `linear-gradient(135deg, var(--${stat.gradient.split(' ')[0].replace('from-', '')}), var(--${stat.gradient.split(' ')[1].replace('to-', '')}))` }}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-4 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10`}>
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1 animate-in fade-in slide-in-from-left duration-700" style={{ animationDelay: "400ms" }}>
            <UploadSection />
          </div>
          
          <div className="lg:col-span-2 animate-in fade-in slide-in-from-right duration-700" style={{ animationDelay: "500ms" }}>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Recent Analyses
              </h2>
            </div>
            <ResultsGrid />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
