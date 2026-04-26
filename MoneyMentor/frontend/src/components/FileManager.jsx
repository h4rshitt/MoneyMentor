import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Trash2, FileText, CheckCircle2, Clock, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../api/client';

export default function FileManager({ files, activeFileId, onFileSelect, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadCSV(file);
      toast.success(`Uploaded "${res.data.filename}" — ${res.data.count} rows`);
      onRefresh(res.data.file_id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onRefresh]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1,
  });

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.deleteFile(id);
      toast.success('File deleted');
      onRefresh(activeFileId === id ? null : activeFileId);
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 dropzone-active'
            : 'border-gray-200 dark:border-white/[0.08] hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-950/10'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
            isDragActive ? 'bg-brand-gradient shadow-brand' : 'bg-gray-100 dark:bg-surface-700'
          }`}>
            <Upload className={`w-6 h-6 ${isDragActive ? 'text-white' : 'text-gray-400'}`} />
          </div>
          {uploading ? (
            <div className="flex items-center gap-2 text-brand-500">
              <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <span className="font-semibold text-sm">Uploading...</span>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                {isDragActive ? 'Drop CSV here' : 'Drag & drop bank statement CSV'}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">CSV format: Date, Description, Amount</p>
            </div>
          )}
        </div>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-slate-500">
          <div className="w-10 h-10 bg-gray-100 dark:bg-surface-700 rounded-xl mx-auto flex items-center justify-center mb-3">
            <FolderOpen className="w-5 h-5 opacity-40" />
          </div>
          <p className="text-sm font-medium">No files uploaded yet</p>
          <p className="text-xs mt-1 opacity-70">Upload a CSV above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="section-label mb-3">
            {files.length} file{files.length !== 1 ? 's' : ''} uploaded
          </p>
          {files.map((f) => {
            const isActive = f.id === activeFileId;
            return (
              <div
                key={f.id}
                onClick={() => onFileSelect(f.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150
                  ${isActive
                    ? 'border-brand-300 dark:border-brand-700/50 bg-brand-50 dark:bg-brand-950/20 shadow-brand-sm'
                    : 'border-gray-100 dark:border-white/[0.05] hover:border-brand-200 dark:hover:border-brand-800/40 hover:bg-gray-50 dark:hover:bg-surface-700/40'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive ? 'bg-brand-gradient shadow-brand-sm' : 'bg-gray-100 dark:bg-surface-700'
                }`}>
                  <FileText className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isActive ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'}`}>
                    {f.filename}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{f.upload_date}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 tabular-nums">{f.row_count} rows</span>
                  </div>
                </div>
                {isActive && <CheckCircle2 className="w-5 h-5 text-brand-500 flex-shrink-0" />}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                  disabled={deleting === f.id}
                  className="p-2 rounded-lg text-gray-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all flex-shrink-0"
                >
                  {deleting === f.id
                    ? <div className="w-4 h-4 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeFileId && (
        <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            Analysing selected file &middot; All insights reflect this file's transactions
          </p>
        </div>
      )}
    </div>
  );
}
