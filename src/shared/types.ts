// Core data models and types for Image2Lcd Converter

export interface ImageData {
  data: Uint8ClampedArray;  // RGBA pixel data
  width: number;
  height: number;
  format: string;           // Original format (png, jpg, etc.)
}

// Type definitions
export type ScanMode = 'horizontal' | 'vertical' | 'horizontal-reverse-byte-vertical' | 'data-vertical-byte-horizontal';
export type ColorFormat = 'mono' | 'gray4' | 'gray16' | 'color256' | 'color4096' | 'color16bit' | 'color18bit' | 'color24bit' | 'color32bit' | 'rgb565' | 'rgb888' | 'grayscale';
export type ByteOrder = 'msb' | 'lsb';
export type BitOrder = 'msb-first' | 'lsb-first';
export type ByteOrderInWord = 'pc-order' | 'reverse-order';
export type Rotation = 0 | 90 | 180 | 270;
export type Mirror = 'none' | 'horizontal' | 'vertical' | 'both';
export type PaletteType = 'rgb332' | 'grayscale' | 'custom';
export type Color4096Format = '12bits-3bytes' | '16bits-word';
export type Color16bitFormat = 'rgb555' | 'rgb565';
export type Color18bitFormat = '6bits-low-byte' | '6bits-high-byte';
export type RGBOrder = 'RGB' | 'RBG' | 'GRB' | 'GBR' | 'BRG' | 'BGR';

// Image2Lcd header structures
export interface HEADGRAY {
  scan: number;      // 1 byte: scan mode flags
  gray: number;      // 1 byte: color depth (1=mono, 2=4gray, 4=16gray, 8=256color)
  w: number;         // 2 bytes: image width
  h: number;         // 2 bytes: image height
}

export interface HEADCOLOR {
  scan: number;      // 1 byte: scan mode flags (same as HEADGRAY)
  gray: number;      // 1 byte: color depth (12=4096, 16=16bit, 18=18bit, 24=24bit, 32=32bit)
  w: number;         // 2 bytes: image width
  h: number;         // 2 bytes: image height
  is565: number;     // 1 byte: format variant flag
  rgb: number;       // 1 byte: RGB component order
}

export interface PALENTRY {
  red: number;       // 1 byte
  green: number;     // 1 byte
  blue: number;      // 1 byte
}

export interface PALETTE {
  palnum: number;    // 2 bytes: number of palette entries
  palentry: PALENTRY[];  // palnum entries
}

export interface ConversionConfig {
  scanMode: ScanMode;
  colorFormat: ColorFormat;
  maxWidth?: number;
  maxHeight?: number;
  invert: boolean;
  byteOrder: ByteOrder;
  includeHeader: boolean;
  identifierName: string;
  bytesPerLine: number;
  dithering: boolean;
  brightness: number;  // -100 to 100
  contrast: number;    // -100 to 100
  rotation: Rotation;
  mirror?: Mirror;
  
  // Advanced bit/byte order options
  bitOrderInByte?: BitOrder;
  byteOrderInWord?: ByteOrderInWord;
  forwardScan?: boolean;
  reverseScan?: boolean;
  
  // Color format specific options
  // For 256-color
  paletteType?: PaletteType;
  includePalette?: boolean;
  customPalette?: Uint8Array;
  
  // For 4096-color
  color4096Format?: Color4096Format;
  
  // For 16-bit color
  color16bitFormat?: Color16bitFormat;
  
  // For 18-bit color
  color18bitFormat?: Color18bitFormat;
  
  // RGB component order
  rgbOrder?: RGBOrder;
}

export interface ImageMetadata {
  width: number;
  height: number;
  colorFormat: string;
  scanMode: string;
  sizeInBytes: number;
}

export interface ConversionResult {
  data: Uint8Array;
  width: number;
  height: number;
  format: string;
  sizeInBytes: number;
  metadata: ImageMetadata;
}

export interface ExportConfig {
  format: 'c-array' | 'binary' | 'hex-text';
  outputPath: string;
}
