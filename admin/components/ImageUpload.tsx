'use client';

import { Link as LinkIcon, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  isRTL?: boolean;
}

export default function ImageUpload({ value, onChange, label, isRTL = false }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(value || '');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(isRTL ? 'نوع الملف غير مسموح. استخدم: jpg, png, gif, webp' : 'File type not allowed. Use: jpg, png, gif, webp');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(isRTL ? 'حجم الملف كبير جداً. الحد الأقصى: 5MB' : 'File too large. Maximum: 5MB');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/auth/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (typeof errorData.detail === 'object' && errorData.detail?.msg) {
            errorMessage = errorData.detail.msg;
          } else if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // JSON parse failed, use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      onChange(data.url);
      setUrlInput(data.url);
    } catch (err: any) {
      console.error('Image upload error:', err);
      let errorMessage = isRTL ? 'فشل رفع الصورة' : 'Failed to upload image';
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message && typeof err.message === 'string') {
        errorMessage = err.message;
      } else if (err?.detail && typeof err.detail === 'string') {
        errorMessage = err.detail;
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const handleClear = () => {
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : ''}`}>
          {label}
        </label>
      )}

      {/* Mode Toggle */}
      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => setUploadMode('upload')}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
            uploadMode === 'upload'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Upload className="w-4 h-4" />
          {isRTL ? 'رفع صورة' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('url')}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
            uploadMode === 'url'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <LinkIcon className="w-4 h-4" />
          {isRTL ? 'رابط URL' : 'URL'}
        </button>
      </div>

      {/* Upload Mode */}
      {uploadMode === 'upload' && (
        <div className="space-y-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors ${
              isUploading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                <span className="text-gray-500">{isRTL ? 'جاري الرفع...' : 'Uploading...'}</span>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {isRTL ? 'اضغط لاختيار صورة أو اسحبها هنا' : 'Click to select or drag image here'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isRTL ? 'JPG, PNG, GIF, WEBP - الحد الأقصى 5MB' : 'JPG, PNG, GIF, WEBP - Max 5MB'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* URL Mode */}
      {uploadMode === 'url' && (
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            placeholder={isRTL ? 'أدخل رابط الصورة...' : 'Enter image URL...'}
            className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
              isRTL ? 'text-right' : ''
            }`}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className={`text-sm text-red-500 ${isRTL ? 'text-right' : ''}`}>{error}</p>
      )}

      {/* Preview */}
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
