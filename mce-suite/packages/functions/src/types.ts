// Defines the shape of the data coming from the client-side 'specs'
export interface OrderSpecs {
  quantity: number;
  size: string; // e.g., "Letter", "A4"
  internalPages: number;
  interiorIsColor: boolean;
  bwPaperSku: string;
  colorPaperSku: string;
  coverPaperSku: string;
  hasCover: boolean;
  bindingMethod: string;
  laminationType: string;
  coverPrintColor: string;
}

// Defines the detailed, processed job properties for calculation
export interface JobDetails {
  quantity: number;
  finishedWidth: number;
  finishedHeight: number;
  bwPages: number;
  bwPaperSku: string;
  colorPages: number;
  colorPaperSku: string;
  hasCover: boolean;
  coverPaperSku: string;
  coverPrintColor: PrintColor;
  coverPrintsOnBothSides: boolean;
  laminationType: LaminationType;
  bindingMethod: BindingMethod;
}

export interface PaperStock {
  id: string;
  sku: string;
  name: string;
  gsm: number;
  type: 'Coated' | 'Uncoated';
  parentWidth: number;
  parentHeight: number;
  costPerSheet: number;
  usage: 'B/W Text and Manga' | 'Internal Color Images' | 'Covers';
}

export enum PrintColor {
    COLOR = '4/0 Full Color One Side',
    COLOR_BOTH_SIDES = '4/4 Full Color Both Sides',
    BW = '1/0 Black and White One Side',
    BW_BOTH_SIDES = '1/1 Black and White Both Sides',
}

export type LaminationType = 'none' | 'gloss' | 'matte';
export type BindingMethod = 'none' | 'perfectBound' | 'saddleStitch';

export interface FileUpload {
  path: string;
  transform: 'stretch' | 'fill';
}

export interface Order {
  id: string;
  userId: string;
  specs: JobDetails;
  totalPrice: number;
  spineWidthInches: number;
  status: 'pending_files' | 'pending_approval' | 'in_production' | 'shipped' | 'assembly_failed';
  createdAt: any; // Firestore Timestamp
  fileUploads?: {
    interior: FileUpload;
    front: FileUpload;
    back: FileUpload;
    spine: FileUpload;
  };
  finalCoverPath?: string;
  finalInteriorPath?: string;
}
