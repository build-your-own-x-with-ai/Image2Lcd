import type { ImageData, ConversionConfig, ConversionResult, ImageMetadata } from '../../shared/types.js';
import { ImageProcessor } from './imageProcessor.js';

export class ImageConverter {
  private processor: ImageProcessor;

  constructor() {
    this.processor = new ImageProcessor();
  }

  /**
   * Convert image to LCD display data format
   */
  convert(image: ImageData, config: ConversionConfig): ConversionResult {
    // Store config for format-specific options
    this.currentConfig = config;

    // Apply preprocessing
    let processedImage = this.applyPreprocessing(image, config);

    // Convert to target color format
    const convertedData = this.convertToColorFormat(processedImage, config.colorFormat);

    // Apply scan mode transformation
    const finalData = this.applyScanMode(
      convertedData,
      processedImage.width,
      processedImage.height,
      config.scanMode
    );

    // Calculate metadata
    const metadata: ImageMetadata = {
      width: processedImage.width,
      height: processedImage.height,
      colorFormat: config.colorFormat,
      scanMode: config.scanMode,
      sizeInBytes: finalData.length
    };

    return {
      data: finalData,
      width: processedImage.width,
      height: processedImage.height,
      format: config.colorFormat,
      sizeInBytes: finalData.length,
      metadata
    };
  }

  /**
   * Apply preprocessing operations to image
   */
  private applyPreprocessing(image: ImageData, config: ConversionConfig): ImageData {
    let processed = image;

    // Resize if needed
    if (config.maxWidth && config.maxHeight) {
      processed = this.processor.resize(processed, config.maxWidth, config.maxHeight);
    }

    // Apply rotation
    if (config.rotation !== 0) {
      processed = this.processor.rotate(processed, config.rotation);
    }

    // Apply mirror
    if (config.mirror && config.mirror !== 'none') {
      processed = this.processor.mirror(processed, config.mirror);
    }

    // Apply brightness adjustment
    if (config.brightness !== 0) {
      processed = this.processor.adjustBrightness(processed, config.brightness);
    }

    // Apply contrast adjustment
    if (config.contrast !== 0) {
      processed = this.processor.adjustContrast(processed, config.contrast);
    }

    // Apply inversion
    if (config.invert) {
      processed = this.processor.invert(processed);
    }

    // Apply dithering for monochrome
    if (config.dithering && config.colorFormat === 'mono') {
      processed = this.processor.applyDithering(processed, 'floyd-steinberg');
    }

    return processed;
  }

  /**
   * Convert image to specified color format
   */
  private convertToColorFormat(image: ImageData, format: string): Uint8Array {
    switch (format) {
      case 'mono':
        return this.convertToMono(image);
      case 'gray4':
        return this.convertToGray4(image);
      case 'gray16':
        return this.convertToGray16(image);
      case 'color256':
        return this.convertToColor256(image);
      case 'color4096':
        return this.convertToColor4096(image);
      case 'color16bit':
      case 'rgb565':
        return this.convertToColor16bit(image);
      case 'color18bit':
        return this.convertToColor18bit(image);
      case 'color24bit':
      case 'rgb888':
        return this.convertToColor24bit(image);
      case 'color32bit':
        return this.convertToColor32bit(image);
      case 'grayscale':
        return this.convertToGrayscale(image);
      default:
        throw new Error(`Unsupported color format: ${format}`);
    }
  }

  /**
   * Convert to monochrome (1 bit per pixel, packed into bytes)
   */
  private convertToMono(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const totalPixels = width * height;
    const byteCount = Math.ceil(totalPixels / 8);
    const result = new Uint8Array(byteCount);

    for (let i = 0; i < totalPixels; i++) {
      const pixelIdx = i * 4;
      const grayscale = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3;
      const bit = grayscale >= 128 ? 1 : 0;

      const byteIdx = Math.floor(i / 8);
      const bitIdx = 7 - (i % 8); // MSB first within byte
      result[byteIdx] |= bit << bitIdx;
    }

    return result;
  }

  /**
   * Convert to 4-level grayscale (2 bits per pixel, 4 pixels per byte)
   */
  private convertToGray4(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const totalPixels = width * height;
    const byteCount = Math.ceil(totalPixels / 4);
    const result = new Uint8Array(byteCount);

    for (let i = 0; i < totalPixels; i++) {
      const pixelIdx = i * 4;
      const grayscale = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3;
      // Map 0-255 to 0-3 (2 bits)
      const gray4 = Math.floor(grayscale / 64);

      const byteIdx = Math.floor(i / 4);
      const pixelInByte = i % 4;
      const bitShift = (3 - pixelInByte) * 2; // MSB first: 6, 4, 2, 0
      result[byteIdx] |= (gray4 & 0x03) << bitShift;
    }

    return result;
  }

  /**
   * Convert to 16-level grayscale (4 bits per pixel, 2 pixels per byte)
   */
  private convertToGray16(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const totalPixels = width * height;
    const byteCount = Math.ceil(totalPixels / 2);
    const result = new Uint8Array(byteCount);

    for (let i = 0; i < totalPixels; i++) {
      const pixelIdx = i * 4;
      const grayscale = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3;
      // Map 0-255 to 0-15 (4 bits)
      const gray16 = Math.floor(grayscale / 16);

      const byteIdx = Math.floor(i / 2);
      const pixelInByte = i % 2;
      const bitShift = (1 - pixelInByte) * 4; // MSB first: 4, 0
      result[byteIdx] |= (gray16 & 0x0F) << bitShift;
    }

    return result;
  }

  /**
   * Convert to 256-color format (8 bits per pixel with palette)
   */
  private convertToColor256(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const result = new Uint8Array(width * height);

    // Simple quantization using RGB332 palette (3 bits R, 3 bits G, 2 bits B)
    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;
      const r = data[pixelIdx] >> 5;     // 3 bits
      const g = data[pixelIdx + 1] >> 5; // 3 bits
      const b = data[pixelIdx + 2] >> 6; // 2 bits

      // Combine into palette index
      result[i] = (r << 5) | (g << 2) | b;
    }

    return result;
  }

  /**
   * Convert to 4096-color format (12 bits per pixel)
   */
  private convertToColor4096(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const config = this.getCurrentConfig();
    const format = config?.color4096Format || '16bits-word';

    if (format === '12bits-3bytes') {
      // 12 bits in 3 bytes: 2 pixels per 3 bytes
      const result = new Uint8Array(Math.ceil((width * height * 3) / 2));
      
      for (let i = 0; i < width * height; i += 2) {
        const pixelIdx1 = i * 4;
        const r1 = data[pixelIdx1] >> 4;     // 4 bits
        const g1 = data[pixelIdx1 + 1] >> 4; // 4 bits
        const b1 = data[pixelIdx1 + 2] >> 4; // 4 bits

        const byteIdx = Math.floor(i * 3 / 2);
        result[byteIdx] = (r1 << 4) | g1;
        result[byteIdx + 1] = (b1 << 4);

        if (i + 1 < width * height) {
          const pixelIdx2 = (i + 1) * 4;
          const r2 = data[pixelIdx2] >> 4;
          const g2 = data[pixelIdx2 + 1] >> 4;
          const b2 = data[pixelIdx2 + 2] >> 4;

          result[byteIdx + 1] |= r2;
          result[byteIdx + 2] = (g2 << 4) | b2;
        }
      }
      return result;
    } else {
      // 16 bits WORD: 2 bytes per pixel
      const result = new Uint8Array(width * height * 2);
      
      for (let i = 0; i < width * height; i++) {
        const pixelIdx = i * 4;
        const r = data[pixelIdx] >> 4;     // 4 bits
        const g = data[pixelIdx + 1] >> 4; // 4 bits
        const b = data[pixelIdx + 2] >> 4; // 4 bits

        const color = (r << 8) | (g << 4) | b;
        result[i * 2] = (color >> 8) & 0xFF;
        result[i * 2 + 1] = color & 0xFF;
      }
      return result;
    }
  }

  /**
   * Convert to 16-bit color (RGB555 or RGB565)
   */
  private convertToColor16bit(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const config = this.getCurrentConfig();
    const format = config?.color16bitFormat || 'rgb565';
    const result = new Uint8Array(width * height * 2);

    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;
      let color: number;

      if (format === 'rgb565') {
        const r = data[pixelIdx] >> 3;     // 5 bits
        const g = data[pixelIdx + 1] >> 2; // 6 bits
        const b = data[pixelIdx + 2] >> 3; // 5 bits
        color = (r << 11) | (g << 5) | b;
      } else {
        // RGB555
        const r = data[pixelIdx] >> 3;     // 5 bits
        const g = data[pixelIdx + 1] >> 3; // 5 bits
        const b = data[pixelIdx + 2] >> 3; // 5 bits
        color = (r << 10) | (g << 5) | b;
      }

      // Store as big-endian (MSB first)
      result[i * 2] = (color >> 8) & 0xFF;
      result[i * 2 + 1] = color & 0xFF;
    }

    return result;
  }

  /**
   * Convert to 18-bit color (6 bits per component)
   */
  private convertToColor18bit(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const config = this.getCurrentConfig();
    const format = config?.color18bitFormat || '6bits-low-byte';
    const result = new Uint8Array(width * height * 3);

    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;
      const r = data[pixelIdx] >> 2;     // 6 bits
      const g = data[pixelIdx + 1] >> 2; // 6 bits
      const b = data[pixelIdx + 2] >> 2; // 6 bits

      if (format === '6bits-low-byte') {
        result[i * 3] = r;
        result[i * 3 + 1] = g;
        result[i * 3 + 2] = b;
      } else {
        // 6bits-high-byte: shift to upper 6 bits
        result[i * 3] = r << 2;
        result[i * 3 + 1] = g << 2;
        result[i * 3 + 2] = b << 2;
      }
    }

    return result;
  }

  /**
   * Convert to 24-bit color (8 bits per component)
   */
  private convertToColor24bit(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const config = this.getCurrentConfig();
    const rgbOrder = config?.rgbOrder || 'RGB';
    const result = new Uint8Array(width * height * 3);

    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;
      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];

      const outIdx = i * 3;
      switch (rgbOrder) {
        case 'RGB':
          result[outIdx] = r;
          result[outIdx + 1] = g;
          result[outIdx + 2] = b;
          break;
        case 'RBG':
          result[outIdx] = r;
          result[outIdx + 1] = b;
          result[outIdx + 2] = g;
          break;
        case 'GRB':
          result[outIdx] = g;
          result[outIdx + 1] = r;
          result[outIdx + 2] = b;
          break;
        case 'GBR':
          result[outIdx] = g;
          result[outIdx + 1] = b;
          result[outIdx + 2] = r;
          break;
        case 'BRG':
          result[outIdx] = b;
          result[outIdx + 1] = r;
          result[outIdx + 2] = g;
          break;
        case 'BGR':
          result[outIdx] = b;
          result[outIdx + 1] = g;
          result[outIdx + 2] = r;
          break;
        default:
          result[outIdx] = r;
          result[outIdx + 1] = g;
          result[outIdx + 2] = b;
      }
    }

    return result;
  }

  /**
   * Convert to 32-bit color (8 bits per component + alpha)
   */
  private convertToColor32bit(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const config = this.getCurrentConfig();
    const rgbOrder = config?.rgbOrder || 'RGB';
    const result = new Uint8Array(width * height * 4);

    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;
      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];
      const a = data[pixelIdx + 3];

      const outIdx = i * 4;
      switch (rgbOrder) {
        case 'RGB':
          result[outIdx] = r;
          result[outIdx + 1] = g;
          result[outIdx + 2] = b;
          result[outIdx + 3] = a;
          break;
        case 'RBG':
          result[outIdx] = r;
          result[outIdx + 1] = b;
          result[outIdx + 2] = g;
          result[outIdx + 3] = a;
          break;
        case 'GRB':
          result[outIdx] = g;
          result[outIdx + 1] = r;
          result[outIdx + 2] = b;
          result[outIdx + 3] = a;
          break;
        case 'GBR':
          result[outIdx] = g;
          result[outIdx + 1] = b;
          result[outIdx + 2] = r;
          result[outIdx + 3] = a;
          break;
        case 'BRG':
          result[outIdx] = b;
          result[outIdx + 1] = r;
          result[outIdx + 2] = g;
          result[outIdx + 3] = a;
          break;
        case 'BGR':
          result[outIdx] = b;
          result[outIdx + 1] = g;
          result[outIdx + 2] = r;
          result[outIdx + 3] = a;
          break;
        default:
          result[outIdx] = r;
          result[outIdx + 1] = g;
          result[outIdx + 2] = b;
          result[outIdx + 3] = a;
      }
    }

    return result;
  }

  /**
   * Helper to get current config (for format-specific options)
   */
  private currentConfig?: ConversionConfig;
  
  private getCurrentConfig(): ConversionConfig | undefined {
    return this.currentConfig;
  }

  /**
   * Generate RGB332 palette (256 colors: 3 bits R, 3 bits G, 2 bits B)
   */
  generateRGB332Palette(): Uint8Array {
    const palette = new Uint8Array(256 * 3);
    
    for (let i = 0; i < 256; i++) {
      const r = (i >> 5) & 0x07;  // 3 bits
      const g = (i >> 2) & 0x07;  // 3 bits
      const b = i & 0x03;          // 2 bits
      
      // Expand to 8 bits
      palette[i * 3] = (r << 5) | (r << 2) | (r >> 1);
      palette[i * 3 + 1] = (g << 5) | (g << 2) | (g >> 1);
      palette[i * 3 + 2] = (b << 6) | (b << 4) | (b << 2) | b;
    }
    
    return palette;
  }

  /**
   * Generate grayscale palette (256 levels)
   */
  generateGrayscalePalette(): Uint8Array {
    const palette = new Uint8Array(256 * 3);
    
    for (let i = 0; i < 256; i++) {
      palette[i * 3] = i;
      palette[i * 3 + 1] = i;
      palette[i * 3 + 2] = i;
    }
    
    return palette;
  }

  /**
   * Convert to RGB565 (16 bits per pixel) - Legacy method
   */
  private convertToRGB565(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const result = new Uint8Array(width * height * 2);

    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;
      const r = data[pixelIdx] >> 3;     // 5 bits
      const g = data[pixelIdx + 1] >> 2; // 6 bits
      const b = data[pixelIdx + 2] >> 3; // 5 bits

      const rgb565 = (r << 11) | (g << 5) | b;

      // Store as big-endian (MSB first)
      result[i * 2] = (rgb565 >> 8) & 0xFF;
      result[i * 2 + 1] = rgb565 & 0xFF;
    }

    return result;
  }

  /**
   * Convert to RGB888 (24 bits per pixel)
   */
  private convertToRGB888(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const result = new Uint8Array(width * height * 3);

    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;
      result[i * 3] = data[pixelIdx];       // R
      result[i * 3 + 1] = data[pixelIdx + 1]; // G
      result[i * 3 + 2] = data[pixelIdx + 2]; // B
    }

    return result;
  }

  /**
   * Convert to grayscale (8 bits per pixel)
   */
  private convertToGrayscale(image: ImageData): Uint8Array {
    const { width, height, data } = image;
    const result = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;
      const grayscale = Math.round(
        0.299 * data[pixelIdx] +
        0.587 * data[pixelIdx + 1] +
        0.114 * data[pixelIdx + 2]
      );
      result[i] = grayscale;
    }

    return result;
  }

  /**
   * Apply scan mode transformation to data
   */
  private applyScanMode(
    data: Uint8Array,
    width: number,
    height: number,
    mode: string
  ): Uint8Array {
    if (mode === 'horizontal') {
      return data; // Already in horizontal scan order
    }

    const config = this.getCurrentConfig();
    const format = config?.colorFormat || 'mono';
    
    // Determine bytes per pixel
    let bytesPerPixel = 1;
    switch (format) {
      case 'mono':
        // For bit-packed formats, handle specially
        return this.applyScanModeBitPacked(data, width, height, mode, 1);
      case 'gray4':
        return this.applyScanModeBitPacked(data, width, height, mode, 2);
      case 'gray16':
        return this.applyScanModeBitPacked(data, width, height, mode, 4);
      case 'grayscale':
      case 'color256':
        bytesPerPixel = 1;
        break;
      case 'color16bit':
      case 'rgb565':
        bytesPerPixel = 2;
        break;
      case 'color18bit':
      case 'color24bit':
      case 'rgb888':
        bytesPerPixel = 3;
        break;
      case 'color32bit':
        bytesPerPixel = 4;
        break;
      case 'color4096':
        // Depends on format
        if (config?.color4096Format === '12bits-3bytes') {
          // Complex packing, skip scan mode for now
          return data;
        }
        bytesPerPixel = 2;
        break;
      default:
        return data;
    }

    return this.applyScanModeBytePerPixel(data, width, height, mode, bytesPerPixel);
  }

  /**
   * Apply scan mode for byte-per-pixel formats
   */
  private applyScanModeBytePerPixel(
    data: Uint8Array,
    width: number,
    height: number,
    mode: string,
    bytesPerPixel: number
  ): Uint8Array {
    const result = new Uint8Array(data.length);

    switch (mode) {
      case 'vertical':
        // Read column by column instead of row by row
        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            const srcIdx = (y * width + x) * bytesPerPixel;
            const dstIdx = (x * height + y) * bytesPerPixel;
            for (let b = 0; b < bytesPerPixel; b++) {
              result[dstIdx + b] = data[srcIdx + b];
            }
          }
        }
        break;

      case 'horizontal-reverse-byte-vertical':
        // Horizontal scan with byte-level vertical reversal
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * bytesPerPixel;
            const dstIdx = ((height - 1 - y) * width + x) * bytesPerPixel;
            for (let b = 0; b < bytesPerPixel; b++) {
              result[dstIdx + b] = data[srcIdx + b];
            }
          }
        }
        break;

      case 'data-vertical-byte-horizontal':
        // Vertical data arrangement with horizontal byte ordering
        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            const srcIdx = (y * width + x) * bytesPerPixel;
            const dstIdx = (y * width + x) * bytesPerPixel;
            for (let b = 0; b < bytesPerPixel; b++) {
              result[dstIdx + b] = data[srcIdx + b];
            }
          }
        }
        break;

      default:
        return data;
    }

    return result;
  }

  /**
   * Apply scan mode for bit-packed formats (mono, gray4, gray16)
   */
  private applyScanModeBitPacked(
    data: Uint8Array,
    width: number,
    height: number,
    mode: string,
    bitsPerPixel: number
  ): Uint8Array {
    // For bit-packed formats, we need to unpack, rearrange, and repack
    // This is complex, so for now return data as-is
    // TODO: Implement proper bit-packed scan mode transformation
    return data;
  }
}
