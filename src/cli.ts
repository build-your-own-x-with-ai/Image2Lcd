#!/usr/bin/env node
import { ImageConverter } from './renderer/services/imageConverter.js';
import { DataFormatter } from './renderer/services/dataFormatter.js';
import type { ConversionConfig } from './shared/types.js';
import sharp from 'sharp';
import fs from 'fs/promises';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: image2lcd <input-image> <output-file> [options]');
    console.log('Options:');
    console.log('  --format <mono|rgb565|rgb888|grayscale>  Color format (default: mono)');
    console.log('  --width <pixels>                          Max width (default: 128)');
    console.log('  --height <pixels>                         Max height (default: 128)');
    console.log('  --output-format <c|bin|hex>               Output format (default: c)');
    console.log('  --identifier <name>                       C array identifier (default: image_data)');
    console.log('  --dithering                               Enable dithering for mono');
    console.log('  --invert                                  Invert colors');
    console.log('  --brightness <-100 to 100>                Adjust brightness');
    console.log('  --contrast <-100 to 100>                  Adjust contrast');
    console.log('  --rotation <0|90|180|270>                 Rotate image');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  // Parse options
  const config: ConversionConfig = {
    scanMode: 'horizontal',
    colorFormat: 'mono',
    maxWidth: 128,
    maxHeight: 128,
    invert: false,
    byteOrder: 'msb',
    includeHeader: false,
    identifierName: 'image_data',
    bytesPerLine: 16,
    dithering: false,
    brightness: 0,
    contrast: 0,
    rotation: 0
  };

  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--format':
        config.colorFormat = args[++i] as any;
        break;
      case '--width':
        config.maxWidth = parseInt(args[++i]);
        break;
      case '--height':
        config.maxHeight = parseInt(args[++i]);
        break;
      case '--output-format':
        // Store for later use
        break;
      case '--identifier':
        config.identifierName = args[++i];
        break;
      case '--dithering':
        config.dithering = true;
        break;
      case '--invert':
        config.invert = true;
        break;
      case '--brightness':
        config.brightness = parseInt(args[++i]);
        break;
      case '--contrast':
        config.contrast = parseInt(args[++i]);
        break;
      case '--rotation':
        config.rotation = parseInt(args[++i]) as any;
        break;
    }
  }

  try {
    console.log(`Loading image: ${inputFile}`);
    
    // Load image using sharp
    const image = sharp(inputFile);
    const metadata = await image.metadata();
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const imageData = {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
      format: metadata.format || 'unknown'
    };

    console.log(`Image loaded: ${imageData.width}x${imageData.height}`);

    // Convert image
    console.log('Converting image...');
    const converter = new ImageConverter();
    const result = converter.convert(imageData, config);

    console.log(`Conversion complete: ${result.width}x${result.height}, ${result.sizeInBytes} bytes`);

    // Format output
    const formatter = new DataFormatter();
    let output: string | Buffer;

    const outputFormat = args.find((arg, i) => args[i - 1] === '--output-format') || 'c';

    switch (outputFormat) {
      case 'c':
        output = formatter.formatAsCArray(result.data, config, result.metadata);
        break;
      case 'bin':
        output = formatter.formatAsBinary(result.data);
        break;
      case 'hex':
        output = formatter.formatAsHexText(result.data, config.bytesPerLine);
        break;
      default:
        output = formatter.formatAsCArray(result.data, config, result.metadata);
    }

    // Write output
    console.log(`Writing output: ${outputFile}`);
    await fs.writeFile(outputFile, output);

    // Generate header file if C format
    if (outputFormat === 'c' && config.includeHeader) {
      const headerFile = outputFile.replace(/\.c$/, '.h');
      const header = formatter.generateHeaderFile(result.metadata, config.identifierName);
      await fs.writeFile(headerFile, header);
      console.log(`Header file written: ${headerFile}`);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
