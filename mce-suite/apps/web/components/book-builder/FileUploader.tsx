'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import UppyUploader from './UppyUploader';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FileUploaderProps {
  orderId: string;
  onUploadComplete: (files: Record<string, any>) => void;
}

export default function FileUploader({ orderId, onUploadComplete }: FileUploaderProps) {
  const { user } = useAuth();
  const [fileUploads, setFileUploads] = useState<Record<string, any>>({
    interior: null,
    cover: {
      front: { path: null, transform: 'stretch' },
      back: { path: null, transform: 'stretch' },
      spine: { path: null, transform: 'stretch' },
    },
  });

  const updateFirestore = async (data: Record<string, any>) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { fileUploads: data });
    onUploadComplete(data);
  };

  const handleUploadSuccess = (fileKey: string, filePath: string) => {
    const newFileUploads = { ...fileUploads };
    if (fileKey === 'interior') {
      newFileUploads.interior = filePath;
    } else {
      (newFileUploads.cover as any)[fileKey].path = filePath;
    }
    setFileUploads(newFileUploads);
    updateFirestore(newFileUploads);
  };

  const handleTransformChange = (fileKey: string, transform: 'stretch' | 'fill') => {
    const newFileUploads = { ...fileUploads };
    (newFileUploads.cover as any)[fileKey].transform = transform;
    setFileUploads(newFileUploads);
    updateFirestore(newFileUploads);
  };

  if (!user) return null;

  const basePath = `uploads/${user.uid}/${orderId}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card>
        <CardHeader><CardTitle>Interior File</CardTitle></CardHeader>
        <CardContent>
          <UppyUploader
            uploadPath={`${basePath}/interior.pdf`}
            allowedFileTypes={['application/pdf']}
            maxNumberOfFiles={1}
            onUploadSuccess={(path) => handleUploadSuccess('interior', path)}
            note="Please upload a single PDF for your book's interior."
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Front Cover</CardTitle></CardHeader>
          <CardContent>
            <UppyUploader
              uploadPath={`${basePath}/front.jpg`}
              maxNumberOfFiles={1}
              onUploadSuccess={(path) => handleUploadSuccess('front', path)}
            />
            <RadioGroup
              defaultValue="stretch"
              onValueChange={(value: 'stretch' | 'fill') => handleTransformChange('front', value)}
              className="mt-4 flex space-x-4"
            >
              <div className="flex items-center space-x-2"><RadioGroupItem value="stretch" id="front-stretch" /><Label htmlFor="front-stretch">Stretch</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="fill" id="front-fill" /><Label htmlFor="front-fill">Fill</Label></div>
            </RadioGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Back Cover</CardTitle></CardHeader>
          <CardContent>
            <UppyUploader
              uploadPath={`${basePath}/back.jpg`}
              maxNumberOfFiles={1}
              onUploadSuccess={(path) => handleUploadSuccess('back', path)}
            />
             <RadioGroup
              defaultValue="stretch"
              onValueChange={(value: 'stretch' | 'fill') => handleTransformChange('back', value)}
              className="mt-4 flex space-x-4"
            >
              <div className="flex items-center space-x-2"><RadioGroupItem value="stretch" id="back-stretch" /><Label htmlFor="back-stretch">Stretch</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="fill" id="back-fill" /><Label htmlFor="back-fill">Fill</Label></div>
            </RadioGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Spine</CardTitle></CardHeader>
          <CardContent>
            <UppyUploader
              uploadPath={`${basePath}/spine.jpg`}
              maxNumberOfFiles={1}
              onUploadSuccess={(path) => handleUploadSuccess('spine', path)}
            />
            <RadioGroup
              defaultValue="stretch"
              onValueChange={(value: 'stretch' | 'fill') => handleTransformChange('spine', value)}
              className="mt-4 flex space-x-4"
            >
              <div className="flex items-center space-x-2"><RadioGroupItem value="stretch" id="spine-stretch" /><Label htmlFor="spine-stretch">Stretch</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="fill" id="spine-fill" /><Label htmlFor="spine-fill">Fill</Label></div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
