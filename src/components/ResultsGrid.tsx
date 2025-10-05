import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle, Clock, Image as ImageIcon, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  const handleDelete = async (id: string, fileName: string) => {
    try {
      const { error } = await supabase
        .from("uploads")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(`${fileName} deleted successfully`);
    } catch (error: any) {
      console.error("Error deleting upload:", error);
      toast.error("Failed to delete upload");
    }
  };

  const getStatusBadge = (status: string, result: string | null) => {
    if (status === "pending" || status === "processing") {
      return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" /> Analyzing</Badge>;
    }
    if (status === "failed") {
      return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
    }
    if (result === "positive") {
      return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" /> Positive</Badge>;
    }
    return <Badge variant="default" className="bg-success text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Negative</Badge>;
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
    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
      {uploads.map((upload, index) => (
        <Card 
          key={upload.id} 
          className="hover-lift border-none shadow-md overflow-hidden group animate-in fade-in slide-in-from-bottom relative"
          style={{ animationDelay: `${index * 50}ms`, animationDuration: "500ms" }}
        >
          {/* Delete button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 z-10 h-6 w-6 bg-destructive/90 hover:bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{upload.file_name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(upload.id, upload.file_name)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
            <img
              src={upload.file_url}
              alt={upload.file_name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          
          <CardHeader className="pb-1 pt-2 px-3 bg-gradient-card">
            <div className="flex items-start justify-between gap-1">
              <CardTitle className="text-xs truncate flex-1 leading-tight">{upload.file_name}</CardTitle>
              {getStatusBadge(upload.status, upload.diagnosis_result)}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-1.5 pt-2 px-3 pb-3">
            {upload.probability_score && (
              <div className="flex justify-between items-center px-2 py-1 rounded bg-primary/5 border border-primary/10">
                <span className="text-[10px] text-muted-foreground">Confidence</span>
                <span className="font-bold text-xs text-primary">{upload.probability_score}%</span>
              </div>
            )}
            {upload.parasites_detected > 0 && (
              <div className="flex justify-between items-center px-2 py-1 rounded bg-destructive/5 border border-destructive/10">
                <span className="text-[10px] text-muted-foreground">Parasites</span>
                <span className="font-bold text-xs text-destructive">{upload.parasites_detected}</span>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground pt-1 border-t">
              {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ResultsGrid;
