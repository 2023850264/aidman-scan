import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, FileText } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Analysis Reports
          </h1>
          <p className="text-muted-foreground">
            View and download your malaria blood smear analysis reports
          </p>
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {report.uploads.file_name}
                      </CardTitle>
                      <CardDescription>
                        {new Date(report.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => downloadReport(report)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Diagnosis</p>
                      <p className="text-lg">{report.uploads.diagnosis_result || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Confidence</p>
                      <p className="text-lg">
                        {report.uploads.probability_score 
                          ? `${(report.uploads.probability_score * 100).toFixed(1)}%` 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Parasites Detected</p>
                      <p className="text-lg">{report.uploads.parasites_detected || 0}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Analysis Summary</h3>
                    <p className="text-sm text-muted-foreground">{report.result_summary}</p>
                  </div>

                  {report.recommendations && (
                    <div>
                      <h3 className="font-semibold mb-2">Recommendations</h3>
                      <p className="text-sm text-muted-foreground">{report.recommendations}</p>
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
