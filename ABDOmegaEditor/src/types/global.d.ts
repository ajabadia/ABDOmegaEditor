/**
 * OMEGA Global Type Declarations
 *
 * Augments the Window interface with the File System Access API
 * (showSaveFilePicker) which is not yet included in TypeScript's
 * default lib declarations.
 */

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: Blob | File | ReadableStream | ArrayBuffer | ArrayBufferView): Promise<void>;
  close(): Promise<void>;
}

interface Window {
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
