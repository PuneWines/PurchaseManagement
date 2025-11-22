import { X } from "lucide-react";

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageViewer = ({ imageUrl, onClose }: ImageViewerProps) => {
  if (!imageUrl) return null;

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-75">
      <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex justify-center items-center p-4 w-full h-full">
          <img
            src={imageUrl}
            alt="Document preview"
            className="max-w-full max-h-[80vh] object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Not+Found';
            }}
          />
        </div>
      </div>
    </div>
  );
};
