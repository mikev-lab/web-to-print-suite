export interface PaperStock {
  name: string;
  gsm: number;
  type: 'Coated' | 'Uncoated';
  finish: string;
  parentWidth: number;
  parentHeight: number;
  sku: string;
  costPerSheet: number;
  usage: string;
}

export enum PrintColor {
  COLOR = 'color',
  BW = 'bw',
}

export type LaminationType = 'none' | 'gloss' | 'matte';
export type BindingMethod = 'none' | 'perfectBound' | 'saddleStitch';

export interface JobDetails {
  quantity: number;
  finishedWidth: number;
  finishedHeight: number;
  bwPages: number;
  bwPaperSku?: string;
  colorPages: number;
  colorPaperSku?: string;
  hasCover: boolean;
  coverPaperSku?: string;
  coverPrintColor: PrintColor;
  coverPrintsOnBothSides: boolean;
  laminationType: LaminationType;
  bindingMethod: BindingMethod;
  // These will be read from the server, not passed from the client
  // laborRate: number;
  // markupPercent: number;
  // spoilagePercent: number;
}

export type TransformType = 'stretch' | 'fill';

export interface FileUpload {
  path: string;
  transform: TransformType;
}

export interface FileUploads {
  interior: { path: string };
  front: FileUpload;
  back: FileUpload;
  spine: FileUpload;
}

export interface Order {
  specs: JobDetails;
  spineWidthInches: number;
  fileUploads: FileUploads;
  status: string;
}
