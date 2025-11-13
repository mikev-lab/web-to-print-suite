'use client';

import { useEffect } from 'react';
import { useBuilder } from '@/context/BuilderContext';
import { useRouter } from 'next/navigation';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase'; // Assuming you have a firebase config file
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext'; // To get the user ID

import VisualPreview from './VisualPreview';
import VisualPaperSelector from './VisualPaperSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';


const getDynamicPrice = httpsCallable(functions, 'getDynamicPrice');


export default function Configurator({ onSaveAndContinue }: { onSaveAndContinue: (orderId: string) => void }) {
    const { specs, updateSpecs, pricingResults, setPricingResults } = useBuilder();
    const { user } = useAuth();
    const router = useRouter();

    const handleSpecChange = (field: string, value: any) => {
        updateSpecs({ [field]: value });
    };

    useEffect(() => {
        const calculatePrice = async () => {
            try {
                const result: any = await getDynamicPrice(specs);
                setPricingResults(result.data);
            } catch (error) {
                console.error("Error calling getDynamicPrice:", error);
                // Optionally, handle the error in the UI
            }
        };

        calculatePrice();
    }, [specs, setPricingResults]);

    const handleSaveAndContinue = async () => {
        if (!user) {
            alert('You must be logged in to save your book.');
            return;
        }

        const newOrderRef = doc(collection(db, 'orders'));
        const orderId = newOrderRef.id;

        const orderData = {
            id: orderId,
            userId: user.uid,
            specs,
            totalPrice: pricingResults.totalPrice,
            spineWidthInches: pricingResults.spineWidthInches,
            status: 'pending_files',
            createdAt: serverTimestamp(),
        };

        await setDoc(newOrderRef, orderData);

        onSaveAndContinue(orderId);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column (Form) */}
            <div className="lg:col-span-3 space-y-6">
                <Card>
                    <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input id="quantity" type="number" value={specs.quantity} onChange={(e) => handleSpecChange('quantity', parseInt(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="finishedWidth">Finished Width (in)</Label>
                            <Input id="finishedWidth" type="number" value={specs.finishedWidth} onChange={(e) => handleSpecChange('finishedWidth', parseFloat(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="finishedHeight">Finished Height (in)</Label>
                            <Input id="finishedHeight" type="number" value={specs.finishedHeight} onChange={(e) => handleSpecChange('finishedHeight', parseFloat(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="bindingMethod">Binding Method</Label>
                            <Select onValueChange={(value) => handleSpecChange('bindingMethod', value)} value={specs.bindingMethod}>
                                <SelectTrigger><SelectValue placeholder="Select binding" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="perfect-bound">Perfect Bound</SelectItem>
                                    <SelectItem value="saddle-stitch">Saddle Stitch</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Interior</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="bwPages">B&W Pages</Label>
                                <Input id="bwPages" type="number" value={specs.bwPages} onChange={(e) => handleSpecChange('bwPages', parseInt(e.target.value))} />
                            </div>
                            <div>
                                <Label htmlFor="colorPages">Color Pages</Label>
                                <Input id="colorPages" type="number" value={specs.colorPages} onChange={(e) => handleSpecChange('colorPages', parseInt(e.target.value))} />
                            </div>
                        </div>
                        <VisualPaperSelector
                            title="B&W Interior Paper"
                            usage="B/W Text and Manga"
                            selectedValue={specs.bwPaperSku}
                            onSelect={(sku) => handleSpecChange('bwPaperSku', sku)}
                        />
                        <VisualPaperSelector
                            title="Color Interior Paper"
                            usage="Internal Color Images"
                            selectedValue={specs.colorPaperSku}
                            onSelect={(sku) => handleSpecChange('colorPaperSku', sku)}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Cover</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="hasCover" checked={specs.hasCover} onCheckedChange={(checked) => handleSpecChange('hasCover', checked)} />
                            <Label htmlFor="hasCover">Has Cover</Label>
                        </div>
                        <VisualPaperSelector
                            title="Cover Paper"
                            usage="Covers"
                            selectedValue={specs.coverPaperSku}
                            onSelect={(sku) => handleSpecChange('coverPaperSku', sku)}
                        />
                         <div className="flex items-center space-x-2">
                            <Switch id="coverPrintsOnBothSides" checked={specs.coverPrintsOnBothSides} onCheckedChange={(checked) => handleSpecChange('coverPrintsOnBothSides', checked)} />
                            <Label htmlFor="coverPrintsOnBothSides">Cover Prints on Both Sides</Label>
                        </div>
                        <div>
                            <Label htmlFor="laminationType">Lamination Type</Label>
                            <Select onValueChange={(value) => handleSpecChange('laminationType', value)} value={specs.laminationType}>
                                <SelectTrigger><SelectValue placeholder="Select lamination" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gloss">Gloss</SelectItem>
                                    <SelectItem value="matte">Matte</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label htmlFor="coverPrintColor">Cover Print Color</Label>
                            <Select onValueChange={(value) => handleSpecChange('coverPrintColor', value)} value={specs.coverPrintColor}>
                                <SelectTrigger><SelectValue placeholder="Select print color" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="4/0">4/0 (Color Front)</SelectItem>
                                    <SelectItem value="4/4">4/4 (Color Both Sides)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column (Summary & Visuals) */}
            <div className="lg-col-span-2">
                <div className="sticky top-8 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Price Summary</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">${pricingResults.totalPrice.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Spine: {pricingResults.spineWidthInches.toFixed(4)}"</p>
                        </CardContent>
                    </Card>
                    <VisualPreview />
                    <Button onClick={handleSaveAndContinue} className="w-full">Save & Continue</Button>
                </div>
            </div>
        </div>
    );
}
