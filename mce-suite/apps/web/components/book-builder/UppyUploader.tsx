'use client';

import { useEffect, useState } from 'react';
import Uppy from '@uppy/core';
import { Dashboard } from '@uppy/react';
import { storage } from '@/lib/firebase'; // Assuming you have a firebase config file
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';

interface UppyUploaderProps {
  uploadPath: string;
  allowedFileTypes?: string[];
  maxNumberOfFiles: number;
  onUploadSuccess: (filePath: string, downloadUrl: string) => void;
  note?: string;
}

export default function UppyUploader({
  uploadPath,
  allowedFileTypes = ['image/*,application/pdf'],
  maxNumberOfFiles,
  onUploadSuccess,
  note,
}: UppyUploaderProps) {
  const [uppy] = useState(() =>
    new Uppy({
      autoProceed: true,
      restrictions: {
        maxNumberOfFiles: maxNumberOfFiles,
        allowedFileTypes: allowedFileTypes,
      },
    })
  );

  useEffect(() => {
    uppy.on('file-added', (file) => {
      // Use the uploadPath directly, as it already contains the full desired path.
      const storageRef = ref(storage, uploadPath);
      uploadBytes(storageRef, file.data)
        .then((snapshot) => {
          uppy.setFileState(file.id, { progress: { uploadComplete: true, uploadStarted: true } });
          getDownloadURL(snapshot.ref).then((downloadURL) => {
            onUploadSuccess(snapshot.ref.fullPath, downloadURL);
          });
        })
        .catch((error) => {
          uppy.setFileState(file.id, { progress: { uploadComplete: false, uploadStarted: false } });
          uppy.info(`Upload failed: ${error.message}`, 'error', 5000);
        });
    });

    return () => {
      uppy.close();
    };
  }, [uppy, uploadPath, onUploadSuccess]);

  return (
    <Dashboard
      uppy={uppy}
      proudlyDisplayPoweredByUppy={false}
      height={300}
      note={note}
    />
  );
}
