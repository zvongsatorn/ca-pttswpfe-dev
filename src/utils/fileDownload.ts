import { saveAs } from 'file-saver';
import { ACTION_LOG, insertActionLog } from '@/services/actionLogService';

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type SavePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

interface FileSystemWritableFileStreamLike {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
}

interface WindowWithSavePicker extends Window {
  showSaveFilePicker?: (options?: SavePickerOptions) => Promise<FileSystemFileHandleLike>;
}

export async function saveExcelFile(data: Blob | ArrayBuffer | Uint8Array, filename: string): Promise<void> {
  const blob = (() => {
    if (data instanceof Blob) return data;
    if (data instanceof ArrayBuffer) {
      return new Blob([data], { type: EXCEL_MIME_TYPE });
    }
    // Normalize to a fresh Uint8Array so TS treats it as a valid BlobPart.
    return new Blob([new Uint8Array(data)], { type: EXCEL_MIME_TYPE });
  })();

  const win = window as WindowWithSavePicker;

  // Prefer native save dialog when available to preserve exact filename.
  if (typeof win.showSaveFilePicker === 'function') {
    try {
      const handle = await win.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Excel Workbook',
            accept: {
              [EXCEL_MIME_TYPE]: ['.xlsx'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      void insertActionLog({
        actionId: ACTION_LOG.EXPORT,
        note: filename,
      });
      return;
    } catch (pickerErr: unknown) {
      if (pickerErr instanceof Error && pickerErr.name === 'AbortError') return;
      console.warn('[Excel] Save picker failed, fallback to file-saver:', pickerErr);
    }
  }

  const file = new File([blob], filename, { type: blob.type || EXCEL_MIME_TYPE });
  saveAs(file, filename);
  void insertActionLog({
    actionId: ACTION_LOG.EXPORT,
    note: filename,
  });
}
