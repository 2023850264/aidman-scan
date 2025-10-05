import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, FileText, Activity, AlertCircle, TrendingUp, User, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Report {
  id: string;
  upload_id: string;
  result_summary: string;
  recommendations: string | null;
  patient_name: string | null;
  patient_bio: string | null;
  malaria_species: string | null;
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
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    patient_name: string;
    patient_bio: string;
    malaria_species: string;
  }>({ patient_name: "", patient_bio: "", malaria_species: "" });

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

  const handleEdit = (report: Report) => {
    setEditingReport(report.id);
    setEditData({
      patient_name: report.patient_name || "",
      patient_bio: report.patient_bio || "",
      malaria_species: report.malaria_species || "",
    });
  };

  const handleSave = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update(editData)
        .eq('id', reportId);

      if (error) throw error;
      
      setEditingReport(null);
      fetchReports();
      toast.success('Patient information updated');
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report');
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

      // Patient Information
      if (report.patient_name || report.patient_bio) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Patient Information", margin, y);
        y += 8;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        if (report.patient_name) {
          doc.text(`Name: ${report.patient_name}`, margin, y);
          y += 6;
        }
        if (report.patient_bio) {
          const bioLines = doc.splitTextToSize(`Bio: ${report.patient_bio}`, pageWidth - 2 * margin);
          bioLines.forEach((line: string) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, margin, y);
            y += 6;
          });
        }
        y += 6;
      }

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
      if (report.malaria_species) {
        doc.text(`Malaria Species: ${report.malaria_species}`, margin, y);
        y += 6;
      }
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
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary animate-glow"></div>
                
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
                    <div className="flex gap-2">
                      {editingReport === report.id ? (
                        <Button
                          onClick={() => handleSave(report.id)}
                          variant="outline"
                          size="lg"
                          className="gap-2 bg-success hover:bg-success/90 text-white border-none"
                        >
                          <Save className="h-5 w-5" />
                          Save
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleEdit(report)}
                          variant="outline"
                          size="lg"
                          className="gap-2"
                        >
                          <Edit2 className="h-5 w-5" />
                          Edit
                        </Button>
                      )}
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
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  {/* Patient Information Section */}
                  {editingReport === report.id ? (
                    <div className="p-6 rounded-xl bg-gradient-to-br from-accent/10 to-primary/5 border border-accent/20 space-y-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <User className="h-5 w-5 text-accent" />
                        Patient Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="patient_name">Patient Name</Label>
                          <Input
                            id="patient_name"
                            value={editData.patient_name}
                            onChange={(e) => setEditData({ ...editData, patient_name: e.target.value })}
                            placeholder="Enter patient name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="patient_bio">Patient Bio / Notes</Label>
                          <Textarea
                            id="patient_bio"
                            value={editData.patient_bio}
                            onChange={(e) => setEditData({ ...editData, patient_bio: e.target.value })}
                            placeholder="Enter patient information, medical history, etc."
                            className="mt-1 min-h-[100px]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="malaria_species">Malaria Species</Label>
                          <Input
                            id="malaria_species"
                            value={editData.malaria_species}
                            onChange={(e) => setEditData({ ...editData, malaria_species: e.target.value })}
                            placeholder="e.g., Plasmodium falciparum"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    (report.patient_name || report.patient_bio || report.malaria_species) && (
                      <div className="p-6 rounded-xl bg-gradient-to-br from-accent/10 to-primary/5 border border-accent/20">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <User className="h-5 w-5 text-accent" />
                          Patient Information
                        </h3>
                        {report.patient_name && (
                          <p className="text-base mb-2">
                            <span className="font-medium">Name:</span> {report.patient_name}
                          </p>
                        )}
                        {report.patient_bio && (
                          <p className="text-muted-foreground mb-2">{report.patient_bio}</p>
                        )}
                        {report.malaria_species && (
                          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-sm font-medium text-destructive">
                              📌 Malaria Species: {report.malaria_species}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* Malaria Species Badge - Pinned */}
                  {!editingReport && report.malaria_species && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/20 to-warning/20 border-2 border-destructive/30 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-destructive/20">
                          <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">MALARIA SPECIES IDENTIFIED</p>
                          <p className="text-xl font-bold text-destructive">{report.malaria_species}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
                      </div>
                      <p className="text-2xl font-bold">{report.uploads.diagnosis_result || 'N/A'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-success/10 border border-accent/20 hover:border-accent/40 transition-colors">
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

                    <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/10 to-warning/10 border border-destructive/20 hover:border-destructive/40 transition-colors">
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
