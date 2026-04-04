import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ImageViewer = ({ 
  src, 
  alt, 
  open, 
  onOpenChange 
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        {/* Close Button - Top Right */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Image Container with Scroll */}
        <div className="w-full h-full flex items-center justify-center bg-black overflow-auto p-4">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="hidden w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <p className="text-lg">Image could not be loaded</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
