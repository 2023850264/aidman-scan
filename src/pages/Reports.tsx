import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, FileText, Activity, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Report {
  id: string;
  upload_id: string;
  result_summary: string;
  recommendations: string | null;
  created_at: string;
  uploads: {
    file_name: string;
    diagnosis_result: string | null;
    probability_score: number | null;
    parasites_detected: number | null;
  };
}

const Reports = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchReports();
      
      const channel = supabase
        .channel('reports-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reports',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchReports();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          uploads (
            file_name,
            diagnosis_result,
            probability_score,
            parasites_detected
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (report: Report) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Malaria Blood Smear Analysis Report", margin, y);
      y += 15;

      // Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date(report.created_at).toLocaleString()}`, margin, y);
      y += 10;

      // Sample Information
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Sample Information", margin, y);
      y += 8;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`File: ${report.uploads.file_name}`, margin, y);
      y += 6;
      doc.text(`Diagnosis: ${report.uploads.diagnosis_result || 'N/A'}`, margin, y);
      y += 6;
      doc.text(`Confidence: ${report.uploads.probability_score ? (report.uploads.probability_score * 100).toFixed(1) + '%' : 'N/A'}`, margin, y);
      y += 6;
      doc.text(`Parasites Detected: ${report.uploads.parasites_detected || 0}`, margin, y);
      y += 12;

      // Analysis Summary
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Analysis Summary", margin, y);
      y += 8;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const summaryLines = doc.splitTextToSize(report.result_summary, pageWidth - 2 * margin);
      summaryLines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 6;
      });
      y += 6;

      // Recommendations
      if (report.recommendations) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Recommendations", margin, y);
        y += 8;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const recLines = doc.splitTextToSize(report.recommendations, pageWidth - 2 * margin);
        recLines.forEach((line: string) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 6;
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save(`malaria-report-${report.id.slice(0, 8)}.pdf`);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download report');
    }
  };

  if (authLoading || loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
              <FileText className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Analysis Reports
            </span>
          </h1>
          <p className="text-muted-foreground text-lg ml-20">
            View and download your malaria blood smear analysis reports
          </p>
        </div>

        {reports.length === 0 ? (
          <Card className="border-none shadow-lg animate-in fade-in slide-in-from-bottom duration-700">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-6 rounded-full bg-gradient-to-br from-muted to-muted/50 mb-6">
                <FileText className="h-16 w-16 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg">No reports available yet</p>
              <p className="text-sm text-muted-foreground mt-2">Upload blood smear images to generate reports</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {reports.map((report, index) => (
              <Card 
                key={report.id} 
                className="hover-lift border-none shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom"
                style={{ animationDelay: `${index * 100}ms`, animationDuration: "700ms" }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
                
                <CardHeader className="bg-gradient-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3 text-xl mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        {report.uploads.file_name}
                      </CardTitle>
                      <CardDescription className="text-base">
                        Generated {new Date(report.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => downloadReport(report)}
                      variant="outline"
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground border-none hover:shadow-lg hover:scale-105 transition-all"
                    >
                      <Download className="h-5 w-5" />
                      Download PDF
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                      <div className="flex items-center gap-3 mb-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
                      </div>
                      <p className="text-2xl font-bold">{report.uploads.diagnosis_result || 'N/A'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-success/10 border border-accent/20">
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="h-5 w-5 text-accent" />
                        <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                      </div>
                      <p className="text-2xl font-bold">
                        {report.uploads.probability_score 
                          ? `${(report.uploads.probability_score * 100).toFixed(1)}%` 
                          : 'N/A'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/10 to-warning/10 border border-destructive/20">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <p className="text-sm font-medium text-muted-foreground">Parasites Detected</p>
                      </div>
                      <p className="text-2xl font-bold">{report.uploads.parasites_detected || 0}</p>
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="p-6 rounded-xl bg-muted/50 border border-border">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                      Analysis Summary
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{report.result_summary}</p>
                  </div>

                  {/* Recommendations Section */}
                  {report.recommendations && (
                    <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-accent to-success rounded-full"></div>
                        Recommendations
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">{report.recommendations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
