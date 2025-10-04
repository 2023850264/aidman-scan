import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle, Clock, Image as ImageIcon } from "lucide-react";
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

    // Set up realtime subscription for upload changes
    const channel = supabase
      .channel('uploads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'uploads'
        },
        () => {
          fetchUploads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <div className="p-6 rounded-full bg-gradient-to-br from-muted to-muted/50 inline-block mb-4">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">No uploads yet. Upload your first blood smear image to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {uploads.map((upload, index) => (
        <Card 
          key={upload.id} 
          className="hover-lift border-none shadow-lg overflow-hidden group animate-in fade-in slide-in-from-bottom"
          style={{ animationDelay: `${index * 100}ms`, animationDuration: "700ms" }}
        >
          <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
            <img
              src={upload.file_url}
              alt={upload.file_name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <CardHeader className="pb-3 bg-gradient-card">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base truncate">{upload.file_name}</CardTitle>
              {getStatusBadge(upload.status, upload.diagnosis_result)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upload.probability_score && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <span className="font-bold text-primary">{upload.probability_score}%</span>
              </div>
            )}
            {upload.parasites_detected > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <span className="text-sm text-muted-foreground">Parasites</span>
                <span className="font-bold text-destructive">{upload.parasites_detected}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ResultsGrid;
