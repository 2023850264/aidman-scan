import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Upload {
  id: string;
  file_name: string;
  file_url: string;
  status: string;
  diagnosis_result: string | null;
  probability_score: number | null;
  parasites_detected: number;
  created_at: string;
}

const ResultsGrid = () => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from("uploads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUploads(data || []);
    } catch (error: any) {
      console.error("Error fetching uploads:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, result: string | null) => {
    if (status === "pending" || status === "processing") {
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Analyzing</Badge>;
    }
    if (status === "failed") {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
    }
    if (result === "positive") {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Positive</Badge>;
    }
    return <Badge variant="default" className="bg-success"><CheckCircle className="h-3 w-3 mr-1" /> Negative</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No uploads yet. Upload your first blood smear image to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {uploads.map((upload) => (
        <Card key={upload.id} className="overflow-hidden">
          <div className="aspect-video bg-muted relative">
            <img
              src={upload.file_url}
              alt={upload.file_name}
              className="w-full h-full object-cover"
            />
          </div>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base truncate">{upload.file_name}</CardTitle>
              {getStatusBadge(upload.status, upload.diagnosis_result)}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upload.probability_score && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-medium">{upload.probability_score}%</span>
              </div>
            )}
            {upload.parasites_detected > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parasites:</span>
                <span className="font-medium">{upload.parasites_detected}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-2">
              {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ResultsGrid;
