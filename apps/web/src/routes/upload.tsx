import { createFileRoute } from "@tanstack/react-router";
import { getUser } from "@/functions/get-user";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/upload")({
  component: RouteComponent,
  beforeLoad: async () => {
    try {
      const session = await getUser();
      return { session };
    } catch {
      return { session: null };
    }
  },
});

type UploadStatus = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  message?: string;
};

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // handle file selection via input or drop
  const handleFiles = (files: FileList) => {
    const newUploads = Array.from(files).map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // upload a single file
  const uploadFile = async (upload: UploadStatus) => {
    setUploads((prev) =>
      prev.map((u) =>
        u.file === upload.file ? { ...u, status: "uploading", progress: 10 } : u
      )
    );

    try {
      const formData = new FormData();
      formData.append("file", upload.file);

      const res = await fetch("/api/pdf-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploads((prev) =>
        prev.map((u) =>
          u.file === upload.file
            ? { ...u, status: "success", progress: 100, message: data.message }
            : u
        )
      );
    } catch (err: any) {
      console.error(err);
      setUploads((prev) =>
        prev.map((u) =>
          u.file === upload.file
            ? { ...u, status: "error", message: err.message, progress: 100 }
            : u
        )
      );
    }
  };

  const handleUploadAll = () => {
    uploads.forEach((upload) => {
      if (upload.status === "pending") uploadFile(upload);
    });
  };

  return (
    <div className="max-w-xl mx-auto py-16 px-4 text-center">
      <h1 className="text-3xl font-bold mb-6">Upload Legal PDFs</h1>

      {session ? (
        <p className="mb-4 text-muted-foreground">Welcome, {session.user.name}</p>
      ) : (
        <p className="mb-4 text-muted-foreground">You are not logged in.</p>
      )}

      {/* Drag-and-drop area */}
      <div
        className="border-2 border-dashed border-gray-400 rounded-lg p-8 mb-4 cursor-pointer hover:border-gray-600 transition"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <p>Drag & drop PDF files here, or click to select files.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Button
        onClick={handleUploadAll}
        disabled={uploads.length === 0 || uploads.every((u) => u.status !== "pending")}
        className="w-full h-12 text-lg mb-6"
      >
        Upload All
      </Button>

      {/* Upload status list */}
      {uploads.length > 0 && (
        <div className="space-y-4">
          {uploads.map((u) => (
            <div key={u.file.name} className="text-left border p-3 rounded-lg">
              <p className="font-semibold">{u.file.name}</p>
              <div className="h-2 bg-gray-200 rounded overflow-hidden mb-1">
                <div
                  className={`h-2 ${
                    u.status === "success"
                      ? "bg-green-500"
                      : u.status === "error"
                      ? "bg-red-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              {u.message && <p className="text-sm text-muted-foreground">{u.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
