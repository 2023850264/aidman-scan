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
      return <Badge variant="outline" className="text-[9px] px-1 py-0"><Clock className="h-2 w-2 mr-0.5" /></Badge>;
    }
    if (status === "failed") {
      return <Badge variant="destructive" className="text-[9px] px-1 py-0"><AlertCircle className="h-2 w-2 mr-0.5" /></Badge>;
    }
    if (result === "positive") {
      return <Badge variant="destructive" className="text-[9px] px-1 py-0">+</Badge>;
    }
    return <Badge variant="default" className="bg-success text-[9px] px-1 py-0">-</Badge>;
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
    <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {uploads.map((upload, index) => (
        <Card 
          key={upload.id} 
          className="hover-lift border-none shadow-sm overflow-hidden group animate-in fade-in slide-in-from-bottom relative"
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
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          
          <CardHeader className="pb-0.5 pt-1.5 px-2 bg-gradient-card">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className="text-[10px] truncate flex-1 leading-tight">{upload.file_name}</CardTitle>
              {getStatusBadge(upload.status, upload.diagnosis_result)}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-1 pt-1.5 px-2 pb-2">
            {upload.probability_score && (
              <div className="flex justify-between items-center px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10">
                <span className="text-[9px] text-muted-foreground">Conf</span>
                <span className="font-bold text-[10px] text-primary">{upload.probability_score}%</span>
              </div>
            )}
            {upload.parasites_detected > 0 && (
              <div className="flex justify-between items-center px-1.5 py-0.5 rounded bg-destructive/5 border border-destructive/10">
                <span className="text-[9px] text-muted-foreground">Para</span>
                <span className="font-bold text-[10px] text-destructive">{upload.parasites_detected}</span>
              </div>
            )}
            <div className="text-[9px] text-muted-foreground pt-0.5 border-t truncate">
              {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ResultsGrid;
