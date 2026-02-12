import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadImage } from '../services/api';

interface ImageUploaderProps {
  onAnalysisStart: (analysisId: string) => void;
  mode: 'general' | 'food';
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onAnalysisStart, mode }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const analysisId = await uploadImage(selectedFile);
      setSelectedFile(null);
      setPreview(null);
      onAnalysisStart(analysisId);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div {...getRootProps()} className="dropzone">
        <input {...getInputProps()} />
        <div className="dropzone-icon">+</div>
        {isDragActive ? (
          <>
            <h3>Drop it here!</h3>
            <p>Release to upload your image</p>
          </>
        ) : (
          <>
            <h3>{mode === 'food' ? 'Upload Food Photo' : 'Drag & Drop Your Image'}</h3>
            <p>or click to browse • Supports JPG, PNG, GIF, WebP</p>
          </>
        )}
      </div>

      {preview && (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="preview-image" />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="upload-button"
          >
            {uploading ? 'Analyzing...' : 'Analyze Image'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
