import type { ConversionConfig, ImageMetadata } from '../../shared/types.js';

export class DataFormatter {
  /**
   * Generate HEADGRAY structure for mono/gray4/gray16/color256 formats
   */
  generateHEADGRAY(config: ConversionConfig, width: number, height: number): Uint8Array {
    const header = new Uint8Array(6);
    
    // Encode scan byte
    let scanByte = 0;
    
    // Bits 0-1: scan mode
    switch (config.scanMode) {
      case 'horizontal':
        scanByte |= 0x00;
        break;
      case 'vertical':
        scanByte |= 0x01;
        break;
      case 'horizontal-reverse-byte-vertical':
        scanByte |= 0x02;
        break;
      case 'data-vertical-byte-horizontal':
        scanByte |= 0x03;
        break;
    }
    
    // Bit 4: byte order (0=PC order, 1=reverse/MSB first)
    if (config.byteOrderInWord === 'reverse-order') {
      scanByte |= 0x10;
    }
    
    // Bit 5: bit order within byte (0=MSB first, 1=LSB first)
    if (config.bitOrderInByte === 'lsb-first') {
      scanByte |= 0x20;
    }
    
    // Bit 6: horizontal scan direction (0=forward, 1=reverse)
    if (config.reverseScan) {
      scanByte |= 0x40;
    }
    
    // Bit 7: vertical scan direction (0=forward, 1=reverse)
    if (config.forwardScan) {
      scanByte |= 0x80;
    }
    
    header[0] = scanByte;
    
    // Gray field: color depth
    switch (config.colorFormat) {
      case 'mono':
        header[1] = 1;
        break;
      case 'gray4':
        header[1] = 2;
        break;
      case 'gray16':
        header[1] = 4;
        break;
      case 'color256':
        header[1] = 8;
        break;
      default:
        header[1] = 1;
    }
    
    // Width (2 bytes, little-endian)
    header[2] = width & 0xFF;
    header[3] = (width >> 8) & 0xFF;
    
    // Height (2 bytes, little-endian)
    header[4] = height & 0xFF;
    header[5] = (height >> 8) & 0xFF;
    
    return header;
  }

  /**
   * Generate HEADCOLOR structure for color4096/16bit/18bit/24bit/32bit formats
   */
  generateHEADCOLOR(config: ConversionConfig, width: number, height: number): Uint8Array {
    const header = new Uint8Array(8);
    
    // Encode scan byte (same as HEADGRAY)
    let scanByte = 0;
    
    switch (config.scanMode) {
      case 'horizontal':
        scanByte |= 0x00;
        break;
      case 'vertical':
        scanByte |= 0x01;
        break;
      case 'horizontal-reverse-byte-vertical':
        scanByte |= 0x02;
        break;
      case 'data-vertical-byte-horizontal':
        scanByte |= 0x03;
        break;
    }
    
    if (config.byteOrderInWord === 'reverse-order') {
      scanByte |= 0x10;
    }
    
    if (config.bitOrderInByte === 'lsb-first') {
      scanByte |= 0x20;
    }
    
    if (config.reverseScan) {
      scanByte |= 0x40;
    }
    
    if (config.forwardScan) {
      scanByte |= 0x80;
    }
    
    header[0] = scanByte;
    
    // Gray field: color depth
    switch (config.colorFormat) {
      case 'color4096':
        header[1] = 12;
        break;
      case 'color16bit':
      case 'rgb565':
        header[1] = 16;
        break;
      case 'color18bit':
        header[1] = 18;
        break;
      case 'color24bit':
      case 'rgb888':
        header[1] = 24;
        break;
      case 'color32bit':
        header[1] = 32;
        break;
      default:
        header[1] = 16;
    }
    
    // Width (2 bytes, little-endian)
    header[2] = width & 0xFF;
    header[3] = (width >> 8) & 0xFF;
    
    // Height (2 bytes, little-endian)
    header[4] = height & 0xFF;
    header[5] = (height >> 8) & 0xFF;
    
    // is565 byte: format variant flag
    let is565 = 0;
    if (config.colorFormat === 'color4096') {
      is565 = config.color4096Format === '12bits-3bytes' ? 1 : 0;
    } else if (config.colorFormat === 'color16bit' || config.colorFormat === 'rgb565') {
      is565 = config.color16bitFormat === 'rgb565' ? 1 : 0;
    } else if (config.colorFormat === 'color18bit') {
      is565 = config.color18bitFormat === '6bits-high-byte' ? 1 : 0;
    }
    header[6] = is565;
    
    // RGB byte: component order (2 bits per component)
    let rgbByte = 0;
    const order = config.rgbOrder || 'RGB';
    const components = order.split('');
    for (let i = 0; i < 3; i++) {
      const component = components[i];
      let value = 0;
      if (component === 'R') value = 0x01;
      else if (component === 'G') value = 0x02;
      else if (component === 'B') value = 0x03;
      rgbByte |= value << ((2 - i) * 2);
    }
    header[7] = rgbByte;
    
    return header;
  }

  /**
   * Generate PALETTE structure for 256-color format
   */
  generatePALETTE(config: ConversionConfig, palette?: Uint8Array): Uint8Array {
    let paletteData: Uint8Array;
    
    if (config.customPalette) {
      paletteData = config.customPalette;
    } else if (config.paletteType === 'grayscale') {
      paletteData = this.generateGrayscalePalette();
    } else {
      // Default to RGB332
      paletteData = this.generateRGB332Palette();
    }
    
    const numEntries = paletteData.length / 3;
    const result = new Uint8Array(2 + paletteData.length);
    
    // palnum (2 bytes, little-endian)
    result[0] = numEntries & 0xFF;
    result[1] = (numEntries >> 8) & 0xFF;
    
    // palette entries
    result.set(paletteData, 2);
    
    return result;
  }

  /**
   * Generate RGB332 palette
   */
  private generateRGB332Palette(): Uint8Array {
    const palette = new Uint8Array(256 * 3);
    
    for (let i = 0; i < 256; i++) {
      const r = (i >> 5) & 0x07;
      const g = (i >> 2) & 0x07;
      const b = i & 0x03;
      
      palette[i * 3] = (r << 5) | (r << 2) | (r >> 1);
      palette[i * 3 + 1] = (g << 5) | (g << 2) | (g >> 1);
      palette[i * 3 + 2] = (b << 6) | (b << 4) | (b << 2) | b;
    }
    
    return palette;
  }

  /**
   * Generate grayscale palette
   */
  private generateGrayscalePalette(): Uint8Array {
    const palette = new Uint8Array(256 * 3);
    
    for (let i = 0; i < 256; i++) {
      palette[i * 3] = i;
      palette[i * 3 + 1] = i;
      palette[i * 3 + 2] = i;
    }
    
    return palette;
  }

  /**
   * Format data as C array
   */
  formatAsCArray(data: Uint8Array, config: ConversionConfig, metadata: ImageMetadata): string {
    const lines: string[] = [];

    // Prepare full data with headers if requested
    let fullData = data;
    if (config.includeHeader) {
      const isGrayFormat = ['mono', 'gray4', 'gray16', 'color256'].includes(config.colorFormat);
      const header = isGrayFormat
        ? this.generateHEADGRAY(config, metadata.width, metadata.height)
        : this.generateHEADCOLOR(config, metadata.width, metadata.height);
      
      // Add palette for 256-color if requested
      if (config.colorFormat === 'color256' && config.includePalette) {
        const palette = this.generatePALETTE(config);
        fullData = new Uint8Array(header.length + palette.length + data.length);
        fullData.set(header, 0);
        fullData.set(palette, header.length);
        fullData.set(data, header.length + palette.length);
      } else {
        fullData = new Uint8Array(header.length + data.length);
        fullData.set(header, 0);
        fullData.set(data, header.length);
      }
    }

    // Add metadata comments
    lines.push('/*');
    lines.push(` * Image: ${config.identifierName}`);
    lines.push(` * Width: ${metadata.width}px`);
    lines.push(` * Height: ${metadata.height}px`);
    lines.push(` * Format: ${metadata.colorFormat}`);
    lines.push(` * Scan Mode: ${metadata.scanMode}`);
    lines.push(` * Size: ${fullData.length} bytes`);
    if (config.includeHeader) {
      lines.push(` * Includes Image2Lcd header`);
    }
    lines.push(' */');
    lines.push('');

    // Array declaration
    lines.push(`const unsigned char ${config.identifierName}[] = {`);

    // Format data bytes
    const bytesPerLine = config.bytesPerLine;
    for (let i = 0; i < fullData.length; i += bytesPerLine) {
      const chunk = fullData.slice(i, Math.min(i + bytesPerLine, fullData.length));
      const hexValues = Array.from(chunk).map(b => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`);
      const line = '  ' + hexValues.join(', ');
      
      if (i + bytesPerLine < fullData.length) {
        lines.push(line + ',');
      } else {
        lines.push(line);
      }
    }

    lines.push('};');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format data as hexadecimal text
   */
  formatAsHexText(data: Uint8Array, bytesPerLine: number): string {
    const lines: string[] = [];

    for (let i = 0; i < data.length; i += bytesPerLine) {
      const chunk = data.slice(i, Math.min(i + bytesPerLine, data.length));
      const hexValues = Array.from(chunk).map(b => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`);
      lines.push(hexValues.join(' '));
    }

    return lines.join('\n');
  }

  /**
   * Format data as binary
   */
  formatAsBinary(data: Uint8Array, config?: ConversionConfig, metadata?: ImageMetadata): Buffer {
    if (!config || !metadata || !config.includeHeader) {
      return Buffer.from(data);
    }

    // Add headers if requested
    const isGrayFormat = ['mono', 'gray4', 'gray16', 'color256'].includes(config.colorFormat);
    const header = isGrayFormat
      ? this.generateHEADGRAY(config, metadata.width, metadata.height)
      : this.generateHEADCOLOR(config, metadata.width, metadata.height);
    
    // Add palette for 256-color if requested
    if (config.colorFormat === 'color256' && config.includePalette) {
      const palette = this.generatePALETTE(config);
      const fullData = new Uint8Array(header.length + palette.length + data.length);
      fullData.set(header, 0);
      fullData.set(palette, header.length);
      fullData.set(data, header.length + palette.length);
      return Buffer.from(fullData);
    } else {
      const fullData = new Uint8Array(header.length + data.length);
      fullData.set(header, 0);
      fullData.set(data, header.length);
      return Buffer.from(fullData);
    }
  }

  /**
   * Generate header file
   */
  generateHeaderFile(metadata: ImageMetadata, identifierName: string): string {
    const lines: string[] = [];
    const guardName = `${identifierName.toUpperCase()}_H`;

    lines.push(`#ifndef ${guardName}`);
    lines.push(`#define ${guardName}`);
    lines.push('');
    lines.push('/*');
    lines.push(` * Image: ${identifierName}`);
    lines.push(` * Width: ${metadata.width}px`);
    lines.push(` * Height: ${metadata.height}px`);
    lines.push(` * Format: ${metadata.colorFormat}`);
    lines.push(` * Scan Mode: ${metadata.scanMode}`);
    lines.push(` * Size: ${metadata.sizeInBytes} bytes`);
    lines.push(' */');
    lines.push('');
    lines.push(`extern const unsigned char ${identifierName}[];`);
    lines.push(`#define ${identifierName.toUpperCase()}_WIDTH ${metadata.width}`);
    lines.push(`#define ${identifierName.toUpperCase()}_HEIGHT ${metadata.height}`);
    lines.push(`#define ${identifierName.toUpperCase()}_SIZE ${metadata.sizeInBytes}`);
    lines.push('');
    lines.push(`#endif // ${guardName}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Apply byte order transformation
   */
  applyByteOrder(data: Uint8Array, byteOrder: 'msb' | 'lsb', bytesPerPixel: number): Uint8Array {
    if (byteOrder === 'msb' || bytesPerPixel === 1) {
      return data; // Already MSB or single byte
    }

    // Swap byte order for LSB
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += bytesPerPixel) {
      for (let j = 0; j < bytesPerPixel; j++) {
        result[i + j] = data[i + (bytesPerPixel - 1 - j)];
      }
    }
    return result;
  }
}
