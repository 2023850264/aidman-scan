import { useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const UploadSection = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, etc.)",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("blood-smears")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("blood-smears")
        .getPublicUrl(fileName);

      // Insert record into uploads table and get the ID
      const { data: uploadRecord, error: insertError } = await supabase
        .from("uploads")
        .insert({
          user_id: user.id,
          file_url: publicUrl,
          file_name: selectedFile.name,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger AI analysis
      const { error: analysisError } = await supabase.functions.invoke('analyze-blood-smear', {
        body: { uploadId: uploadRecord.id }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        toast({
          variant: "destructive",
          title: "Analysis started with errors",
          description: "Image uploaded but analysis may have failed. Check results shortly.",
        });
      } else {
        toast({
          title: "Analysis started!",
          description: "Your blood smear image is being analyzed. Results will appear shortly.",
        });
      }

      // Reset form
      setSelectedFile(null);
      setPreview(null);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Blood Smear Image</CardTitle>
        <CardDescription>
          Upload a clear image of a thin blood smear for malaria parasite detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer hover:border-primary transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              Click to select or drag and drop your blood smear image
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              JPEG, PNG up to 10MB
            </p>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-contain bg-muted"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">
                {selectedFile?.name}
              </span>
            </div>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload & Analyze"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadSection;
