import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react"; // Import X icon for clear functionality

type FileUploadProps = {
  onFileSelect: (file: File | null) => void;
  selectedFile?: File | null; // Add selectedFile prop
  accept?: string; // e.g. ".txt,.csv,.json"
  label?: string;
  className?: string;
};

export function FileUpload({
  onFileSelect,
  selectedFile,
  accept,
  label,
  className
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string>("");

  // Sync with selectedFile prop
  useEffect(() => {
    if (selectedFile) {
      setFileName(selectedFile.name);
    } else {
      setFileName("");
    }
  }, [selectedFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFileName(file.name);
      onFileSelect(file);
    } else {
      setFileName("");
      onFileSelect(null);
    }
  };

  const handleClear = () => {
    setFileName("");
    onFileSelect(null);
    // Reset the input value
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label && <p className="mb-1 font-medium">{label}</p>}
      <div className="relative">
        <label
          className={cn(
            "flex items-center justify-between w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer",
            "hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
            fileName
              ? "border-blue-300 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-700"
              : "border-slate-300 dark:border-slate-600"
          )}
        >
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />
          <span
            className={cn(
              "text-lg",
              fileName
                ? "text-blue-700 dark:text-blue-300 font-medium"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            {fileName ? fileName : "Click to upload or drag a file here"}
          </span>
        </label>

        {/* Clear button - only show when there's a file */}
        {fileName && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
