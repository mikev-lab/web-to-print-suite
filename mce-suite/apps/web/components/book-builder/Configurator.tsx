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

    const handleInternalPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow user to type, validation happens onBlur
        handleSpecChange('internalPages', value === '' ? '' : parseInt(value));
    };

    const handleInternalPageBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        let pageCount = parseInt(e.target.value) || 0;
        const { bindingMethod } = specs;

        let increment = 2;
        let minPages = 16;

        if (bindingMethod === 'saddle-stitch') {
            increment = 4;
            minPages = 4;
        }

        // Enforce minimum
        if (pageCount < minPages) {
            pageCount = minPages;
        }

        // Round up to the nearest increment
        const remainder = pageCount % increment;
        if (remainder !== 0) {
            pageCount = pageCount + (increment - remainder);
        }

        handleSpecChange('internalPages', pageCount);
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
                            <Label htmlFor="size">Size</Label>
                            <Select onValueChange={(value) => handleSpecChange('size', value)} value={specs.size}>
                                <SelectTrigger><SelectValue placeholder="Select a size" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Letter">Letter (8.5" x 11")</SelectItem>
                                    <SelectItem value="Standard Comic">Standard Comic (6.625" x 10.25")</SelectItem>
                                    <SelectItem value="A4">A4 (8.27" x 11.69")</SelectItem>
                                    <SelectItem value="B5">B5 (7.17" x 10.12")</SelectItem>
                                    <SelectItem value="Trade Paperback">Trade Paperback (6" x 9")</SelectItem>
                                    <SelectItem value="A5">A5 (5.83" x 8.27")</SelectItem>
                                    <SelectItem value="Digest">Digest (5.5" x 8.5")</SelectItem>
                                    <SelectItem value="Tankōbon">Tankōbon (5" x 7.5")</SelectItem>
                                    <SelectItem value="B6">B6 (5.04" x 7.17")</SelectItem>
                                    <SelectItem value="A6">A6 (4.13" x 5.83")</SelectItem>
                                    <SelectItem value="Mass Market Paperback">Mass Market Paperback (4.25" x 6.87")</SelectItem>
                                </SelectContent>
                            </Select>
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
                        <div className="grid grid-cols-2 gap-4 items-center">
                            <div>
                                <Label htmlFor="internalPages">Internal Pages</Label>
                                <Input
                                    id="internalPages"
                                    type="number"
                                    value={specs.internalPages}
                                    onChange={handleInternalPageChange}
                                    onBlur={handleInternalPageBlur}
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                                <Switch
                                    id="interiorIsColor"
                                    checked={specs.interiorIsColor}
                                    onCheckedChange={(checked) => handleSpecChange('interiorIsColor', checked)}
                                />
                                <Label htmlFor="interiorIsColor">Color Interior</Label>
                            </div>
                        </div>
                        {specs.interiorIsColor ? (
                            <VisualPaperSelector
                                title="Color Interior Paper"
                                usage="Internal Color Images"
                                selectedValue={specs.colorPaperSku}
                                onSelect={(sku) => handleSpecChange('colorPaperSku', sku)}
                            />
                        ) : (
                            <VisualPaperSelector
                                title="B&W Interior Paper"
                                usage="B/W Text and Manga"
                                selectedValue={specs.bwPaperSku}
                                onSelect={(sku) => handleSpecChange('bwPaperSku', sku)}
                            />
                        )}
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
                        <div>
                            <Label htmlFor="laminationType">Lamination Type</Label>
                            <Select onValueChange={(value) => handleSpecChange('laminationType', value)} value={specs.laminationType}>
                                <SelectTrigger><SelectValue placeholder="Select lamination" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="Gloss">Gloss</SelectItem>
                                    <SelectItem value="Matte">Matte</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="coverPrintColor">Cover Print Color</Label>
                            <Select onValueChange={(value) => handleSpecChange('coverPrintColor', value)} value={specs.coverPrintColor}>
                                <SelectTrigger><SelectValue placeholder="Select print color" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="4/0 Full Color One Side">4/0 Full Color One Side</SelectItem>
                                    <SelectItem value="4/4 Full Color Both Sides">4/4 Full Color Both Sides</SelectItem>
                                    <SelectItem value="1/0 Black and White One Side">1/0 Black and White One Side</SelectItem>
                                    <SelectItem value="1/1 Black and White Both Sides">1/1 Black and White Both Sides</SelectItem>
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
