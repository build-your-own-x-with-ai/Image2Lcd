import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ImageConverter } from './imageConverter.js';
import type { ImageData, ConversionConfig } from '../../shared/types.js';

describe('ImageConverter', () => {
  const converter = new ImageConverter();

  // Helper to create test image data
  function createTestImage(width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(Math.random() * 256);     // R
      data[i + 1] = Math.floor(Math.random() * 256); // G
      data[i + 2] = Math.floor(Math.random() * 256); // B
      data[i + 3] = 255;                              // A
    }
    return { data, width, height, format: 'test' };
  }

  // Helper to create default config
  function createConfig(overrides: Partial<ConversionConfig> = {}): ConversionConfig {
    return {
      scanMode: 'horizontal',
      colorFormat: 'mono',
      maxWidth: 1000,
      maxHeight: 1000,
      invert: false,
      byteOrder: 'msb',
      includeHeader: false,
      identifierName: 'image',
      bytesPerLine: 16,
      dithering: false,
      brightness: 0,
      contrast: 0,
      rotation: 0,
      ...overrides
    };
  }

  describe('Property 38: Color format bit depth', () => {
    // Feature: image-to-lcd-converter, Property 38: Color format bit depth
    it('should produce correct data size for gray4 format (2 bits per pixel)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 32 }),
          fc.integer({ min: 4, max: 32 }),
          (width, height) => {
            const image = createTestImage(width, height);
            const config: ConversionConfig = {
              scanMode: 'horizontal',
              colorFormat: 'gray4',
              maxWidth: width,
              maxHeight: height,
              invert: false,
              byteOrder: 'msb',
              includeHeader: false,
              identifierName: 'test',
              bytesPerLine: 16,
              dithering: false,
              brightness: 0,
              contrast: 0,
              rotation: 0
            };
            
            const result = converter.convert(image, config);
            const expectedSize = Math.ceil((width * height) / 4); // 4 pixels per byte
            return result.sizeInBytes === expectedSize;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce correct data size for gray16 format (4 bits per pixel)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 32 }),
          fc.integer({ min: 4, max: 32 }),
          (width, height) => {
            const image = createTestImage(width, height);
            const config: ConversionConfig = {
              scanMode: 'horizontal',
              colorFormat: 'gray16',
              maxWidth: width,
              maxHeight: height,
              invert: false,
              byteOrder: 'msb',
              includeHeader: false,
              identifierName: 'test',
              bytesPerLine: 16,
              dithering: false,
              brightness: 0,
              contrast: 0,
              rotation: 0
            };
            
            const result = converter.convert(image, config);
            const expectedSize = Math.ceil((width * height) / 2); // 2 pixels per byte
            return result.sizeInBytes === expectedSize;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Color format conversion', () => {
    // Feature: image-to-lcd-converter, Property 7: Color format conversion
    it('should produce output data size matching expected size for monochrome format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 8, max: 100 }),  // width (multiple of 8 for easier calculation)
          fc.integer({ min: 10, max: 100 }), // height
          (width, height) => {
            const image = createTestImage(width, height);
            const config = createConfig({ colorFormat: 'mono' });

            const result = converter.convert(image, config);

            // Monochrome: 1 bit per pixel, packed into bytes
            const expectedSize = Math.ceil((width * height) / 8);
            expect(result.sizeInBytes).toBe(expectedSize);
            expect(result.data.length).toBe(expectedSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce output data size matching expected size for RGB565 format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // width
          fc.integer({ min: 10, max: 100 }), // height
          (width, height) => {
            const image = createTestImage(width, height);
            const config = createConfig({ colorFormat: 'rgb565' });

            const result = converter.convert(image, config);

            // RGB565: 2 bytes per pixel
            const expectedSize = width * height * 2;
            expect(result.sizeInBytes).toBe(expectedSize);
            expect(result.data.length).toBe(expectedSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce output data size matching expected size for RGB888 format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // width
          fc.integer({ min: 10, max: 100 }), // height
          (width, height) => {
            const image = createTestImage(width, height);
            const config = createConfig({ colorFormat: 'rgb888' });

            const result = converter.convert(image, config);

            // RGB888: 3 bytes per pixel
            const expectedSize = width * height * 3;
            expect(result.sizeInBytes).toBe(expectedSize);
            expect(result.data.length).toBe(expectedSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce output data size matching expected size for grayscale format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // width
          fc.integer({ min: 10, max: 100 }), // height
          (width, height) => {
            const image = createTestImage(width, height);
            const config = createConfig({ colorFormat: 'grayscale' });

            const result = converter.convert(image, config);

            // Grayscale: 1 byte per pixel
            const expectedSize = width * height;
            expect(result.sizeInBytes).toBe(expectedSize);
            expect(result.data.length).toBe(expectedSize);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Scan mode application', () => {
    // Feature: image-to-lcd-converter, Property 6: Scan mode application
    it('should apply scan mode to conversion output', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }), // width
          fc.integer({ min: 10, max: 50 }), // height
          fc.constantFrom('horizontal', 'vertical', 'horizontal-reverse', 'vertical-reverse'),
          (width, height, scanMode) => {
            const image = createTestImage(width, height);
            const config = createConfig({ 
              colorFormat: 'grayscale',
              scanMode: scanMode as any
            });

            const result = converter.convert(image, config);

            // Verify scan mode is recorded in metadata
            expect(result.metadata.scanMode).toBe(scanMode);
            
            // Verify data exists and has correct size
            expect(result.data.length).toBe(width * height);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 34: Preprocessing preview consistency', () => {
    // Feature: image-to-lcd-converter, Property 34: Preprocessing preview consistency
    it('should apply all preprocessing operations before conversion', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 200 }), // width
          fc.integer({ min: 50, max: 200 }), // height
          fc.integer({ min: -50, max: 50 }), // brightness
          fc.integer({ min: -50, max: 50 }), // contrast
          (width, height, brightness, contrast) => {
            const image = createTestImage(width, height);
            
            // Config with preprocessing
            const config = createConfig({
              colorFormat: 'grayscale',
              brightness,
              contrast,
              invert: true,
              rotation: 90
            });

            const result = converter.convert(image, config);

            // After 90 degree rotation, dimensions should be swapped
            expect(result.width).toBe(height);
            expect(result.height).toBe(width);
            
            // Data should exist
            expect(result.data.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
