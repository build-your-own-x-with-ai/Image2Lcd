import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DataFormatter } from './dataFormatter.js';
import type { ConversionConfig, ImageMetadata } from '../../shared/types.js';

describe('DataFormatter', () => {
  const formatter = new DataFormatter();

  // Helper to create test data
  function createTestData(size: number): Uint8Array {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = Math.floor(Math.random() * 256);
    }
    return data;
  }

  // Helper to create config
  function createConfig(overrides: Partial<ConversionConfig> = {}): ConversionConfig {
    return {
      scanMode: 'horizontal',
      colorFormat: 'mono',
      maxWidth: 1000,
      maxHeight: 1000,
      invert: false,
      byteOrder: 'msb',
      includeHeader: false,
      identifierName: 'image_data',
      bytesPerLine: 16,
      dithering: false,
      brightness: 0,
      contrast: 0,
      rotation: 0,
      ...overrides
    };
  }

  // Helper to create metadata
  function createMetadata(overrides: Partial<ImageMetadata> = {}): ImageMetadata {
    return {
      width: 100,
      height: 100,
      colorFormat: 'mono',
      scanMode: 'horizontal',
      sizeInBytes: 1250,
      ...overrides
    };
  }

  describe('Property 14: C array format validity', () => {
    // Feature: image-to-lcd-converter, Property 14: C array format validity
    it('should generate valid C code that contains array declaration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 200 }), // data size
          fc.integer({ min: 8, max: 32 }),   // bytes per line
          (dataSize, bytesPerLine) => {
            const data = createTestData(dataSize);
            const config = createConfig({ bytesPerLine });
            const metadata = createMetadata({ sizeInBytes: dataSize });

            const output = formatter.formatAsCArray(data, config, metadata);

            // Check for C array declaration
            expect(output).toContain('const unsigned char');
            expect(output).toContain('image_data[]');
            expect(output).toContain('= {');
            expect(output).toContain('};');
            
            // Check for hex values with 0x prefix
            expect(output).toMatch(/0x[0-9A-F]{2}/);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 19: Custom identifier usage', () => {
    // Feature: image-to-lcd-converter, Property 19: Custom identifier usage
    it('should use custom identifier name in generated C code', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // data size
          fc.stringMatching(/^[a-z][a-z0-9_]{2,15}$/), // valid C identifier
          (dataSize, identifierName) => {
            const data = createTestData(dataSize);
            const config = createConfig({ identifierName });
            const metadata = createMetadata({ sizeInBytes: dataSize });

            const output = formatter.formatAsCArray(data, config, metadata);

            // Check that custom identifier is used
            expect(output).toContain(`${identifierName}[]`);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 17: Metadata inclusion', () => {
    // Feature: image-to-lcd-converter, Property 17: Metadata inclusion
    it('should include metadata comments in C array output', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),  // width
          fc.integer({ min: 10, max: 100 }),  // height
          fc.constantFrom('mono', 'rgb565', 'rgb888', 'grayscale'),
          fc.constantFrom('horizontal', 'vertical'),
          (width, height, colorFormat, scanMode) => {
            const data = createTestData(100);
            const config = createConfig({ colorFormat: colorFormat as any });
            const metadata = createMetadata({
              width,
              height,
              colorFormat,
              scanMode,
              sizeInBytes: 100
            });

            const output = formatter.formatAsCArray(data, config, metadata);

            // Check for metadata in comments
            expect(output).toContain(`Width: ${width}px`);
            expect(output).toContain(`Height: ${height}px`);
            expect(output).toContain(`Format: ${colorFormat}`);
            expect(output).toContain(`Scan Mode: ${scanMode}`);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 15: Binary format correctness', () => {
    // Feature: image-to-lcd-converter, Property 15: Binary format correctness
    it('should produce binary output with exact size matching input', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 500 }), // data size
          (dataSize) => {
            const data = createTestData(dataSize);

            const output = formatter.formatAsBinary(data);

            // Binary output size should match input size exactly
            expect(output.length).toBe(dataSize);
            
            // Verify data is preserved
            for (let i = 0; i < dataSize; i++) {
              expect(output[i]).toBe(data[i]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: Hexadecimal formatting', () => {
    // Feature: image-to-lcd-converter, Property 21: Hexadecimal formatting
    it('should format all values with 0x prefix in hex text output', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // data size
          fc.integer({ min: 8, max: 32 }),   // bytes per line
          (dataSize, bytesPerLine) => {
            const data = createTestData(dataSize);

            const output = formatter.formatAsHexText(data, bytesPerLine);

            // Split into individual hex values
            const hexValues = output.match(/0x[0-9A-F]{2}/g) || [];
            
            // All values should have 0x prefix
            expect(hexValues.length).toBeGreaterThan(0);
            hexValues.forEach(hex => {
              expect(hex).toMatch(/^0x[0-9A-F]{2}$/);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 22: Line width formatting', () => {
    // Feature: image-to-lcd-converter, Property 22: Line width formatting
    it('should format output with specified bytes per line', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 200 }), // data size (larger to ensure multiple lines)
          fc.integer({ min: 8, max: 16 }),   // bytes per line
          (dataSize, bytesPerLine) => {
            const data = createTestData(dataSize);

            const output = formatter.formatAsHexText(data, bytesPerLine);

            const lines = output.split('\n').filter(line => line.length > 0);
            
            // Check that most lines have the correct number of values
            // (last line may have fewer)
            for (let i = 0; i < lines.length - 1; i++) {
              const hexValues = lines[i].match(/0x[0-9A-F]{2}/g) || [];
              expect(hexValues.length).toBe(bytesPerLine);
            }
            
            // Last line should have remaining bytes
            const lastLine = lines[lines.length - 1];
            const lastLineValues = lastLine.match(/0x[0-9A-F]{2}/g) || [];
            const expectedLastLineCount = dataSize % bytesPerLine || bytesPerLine;
            expect(lastLineValues.length).toBe(expectedLastLineCount);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 18: Byte order consistency', () => {
    // Feature: image-to-lcd-converter, Property 18: Byte order consistency
    it('should arrange bytes in specified order for multi-byte formats', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }), // number of pixels
          fc.constantFrom('msb', 'lsb'),
          (pixelCount, byteOrder) => {
            // Create RGB565 data (2 bytes per pixel)
            const data = createTestData(pixelCount * 2);

            const result = formatter.applyByteOrder(data, byteOrder as any, 2);

            expect(result.length).toBe(data.length);
            
            if (byteOrder === 'msb') {
              // MSB: data should be unchanged
              for (let i = 0; i < data.length; i++) {
                expect(result[i]).toBe(data[i]);
              }
            } else {
              // LSB: bytes should be swapped within each pixel
              for (let i = 0; i < pixelCount; i++) {
                expect(result[i * 2]).toBe(data[i * 2 + 1]);
                expect(result[i * 2 + 1]).toBe(data[i * 2]);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 20: Header file generation', () => {
    // Feature: image-to-lcd-converter, Property 20: Header file generation
    it('should create header file with matching declarations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 200 }),  // width
          fc.integer({ min: 10, max: 200 }),  // height
          fc.stringMatching(/^[a-z][a-z0-9_]{2,15}$/), // identifier
          (width, height, identifierName) => {
            const metadata = createMetadata({
              width,
              height,
              sizeInBytes: width * height
            });

            const header = formatter.generateHeaderFile(metadata, identifierName);

            // Check for header guards
            const guardName = `${identifierName.toUpperCase()}_H`;
            expect(header).toContain(`#ifndef ${guardName}`);
            expect(header).toContain(`#define ${guardName}`);
            expect(header).toContain(`#endif // ${guardName}`);
            
            // Check for extern declaration
            expect(header).toContain(`extern const unsigned char ${identifierName}[]`);
            
            // Check for defines
            expect(header).toContain(`#define ${identifierName.toUpperCase()}_WIDTH ${width}`);
            expect(header).toContain(`#define ${identifierName.toUpperCase()}_HEIGHT ${height}`);
            expect(header).toContain(`#define ${identifierName.toUpperCase()}_SIZE`);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
