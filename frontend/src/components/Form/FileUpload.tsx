import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  multiple?: boolean;
  accept?: string;
  previews: string[];
  onFilesSelected: (files: File[]) => void;
  onRemove?: (index: number) => void;
  icon?: React.ReactNode;
}

export default function FileUpload({
  label = 'Upload image',
  multiple = false,
  accept = 'image/*',
  previews,
  onFilesSelected,
  onRemove,
  icon,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = '';
  };

  return (
    <div className="file-upload">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="file-upload-input"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        className="file-upload-trigger"
        onClick={(e) => {
          e.preventDefault();
          inputRef.current?.click();
        }}
      >
        {icon ?? <ImagePlus size={18} />}
        <span>{label}</span>
      </button>

      {previews.length > 0 && (
        <div className="file-upload-previews">
          {previews.map((src, i) => (
            <div key={i} className="file-upload-preview">
              <img src={src} alt="" />
              {onRemove && (
                <button
                  type="button"
                  className="file-upload-remove"
                  onClick={(e) => {
                    e.preventDefault();
                    onRemove(i);
                  }}
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
