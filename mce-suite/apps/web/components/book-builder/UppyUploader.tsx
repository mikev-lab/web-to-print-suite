'use client';

import { useEffect, useState } from 'react';
import Uppy from '@uppy/core';
// @ts-ignore
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
      // Check if file.data exists before trying to upload
      if (file.data instanceof Blob) {
        // Use the uploadPath directly, as it already contains the full desired path.
        const storageRef = ref(storage, uploadPath);
        uploadBytes(storageRef, file.data)
          .then((snapshot) => {
            uppy.setFileState(file.id, {
              progress: {
                uploadComplete: true,
                uploadStarted: Date.now(),
                bytesUploaded: snapshot.metadata.size,
                bytesTotal: snapshot.metadata.size,
              },
            });
            getDownloadURL(snapshot.ref).then((downloadURL) => {
              onUploadSuccess(snapshot.ref.fullPath, downloadURL);
            });
          })
          .catch((error) => {
        uppy.setFileState(file.id, {
          progress: {
            uploadComplete: false,
            uploadStarted: null,
            bytesUploaded: false,
            bytesTotal: file.size,
          },
        });
            uppy.info(`Upload failed: ${error.message}`, 'error', 5000);
          });
      } else {
        // Handle the case where the file data is missing
        uppy.setFileState(file.id, {
          progress: {
            uploadComplete: false,
            uploadStarted: null,
            bytesUploaded: false,
            bytesTotal: file.size,
          },
        });
        uppy.info(`File data is missing for ${file.name}`, 'error', 5000);
      }
    });

    return () => {
      // @ts-ignore
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
