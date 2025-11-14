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
  COLOR = 'color',
  BW = 'bw',
}

export type LaminationType = 'none' | 'gloss' | 'matte';
export type BindingMethod = 'none' | 'perfectBound' | 'saddleStitch';

export interface FileUpload {
  path: string;
  transform: 'stretch' | 'fill';
}

export interface Order {
  specs: JobDetails;
  spineWidthInches: number;
  fileUploads: {
    interior: FileUpload;
    front: FileUpload;
    back: FileUpload;
    spine: FileUpload;
  };
}
