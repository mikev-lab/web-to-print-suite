'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

// Define the shape of a paper document from Firestore
interface Paper {
  id: string;
  sku: string;
  name: string;
  gsm: number;
  type?: string; // Type is optional as it may not be in all Firestore docs
  thumbnailUrl?: string;
  usage: string;
}

interface VisualPaperSelectorProps {
  usage: 'B/W Text and Manga' | 'Internal Color Images' | 'Covers';
  selectedValue: string;
  onSelect: (sku: string) => void;
  title: string;
}

export default function VisualPaperSelector({ usage, selectedValue, onSelect, title }: VisualPaperSelectorProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPapers = async () => {
      setLoading(true);
      const papersRef = collection(db, 'pricing_matrix');
      const q = query(papersRef, where('usage', '==', usage));
      const querySnapshot = await getDocs(q);
      const fetchedPapers = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Paper[];
      setPapers(fetchedPapers);
      setLoading(false);
    };

    fetchPapers();
  }, [usage]);

  if (loading) {
    return <div>Loading paper options...</div>;
  }

  const formatPaperName = (paper: Paper) => {
    // Regex to find the weight, which is typically a number followed by '#' or 'lb'
    const weightMatch = paper.name.match(/\d+(#|lb)/);
    const weight = weightMatch ? weightMatch[0] : '';

    // Use the type field if it exists, otherwise infer it from the name
    let type = paper.type;
    if (!type) {
        const lowerCaseName = paper.name.toLowerCase();
        if (lowerCaseName.includes('gloss')) type = 'Coated';
        else if (lowerCaseName.includes('silk')) type = 'Coated';
        else if (lowerCaseName.includes('matte')) type = 'Coated';
        else type = 'Uncoated';
    }

    return `${weight} ${type}`;
  };

  return (
    <div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {papers.map((paper) => (
            <Card
            key={paper.id}
            onClick={() => onSelect(paper.sku)}
            className={cn(
                'cursor-pointer transition-all',
                selectedValue === paper.sku ? 'border-primary ring-2 ring-primary' : 'border-border'
            )}
            >
            <CardContent className="p-2">
                <div className="aspect-square w-full bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                {paper.thumbnailUrl ? (
                    <img src={paper.thumbnailUrl} alt={paper.name} className="w-full h-full object-cover rounded-md" />
                ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                )}
                </div>
                <p className="text-sm font-medium text-center">{formatPaperName(paper)}</p>
                <p className="text-xs text-muted-foreground text-center">{paper.gsm} GSM</p>
            </CardContent>
            </Card>
        ))}
        </div>
    </div>
  );
}
