import React, { useState, useCallback } from 'react';
import { ImageConverter } from './services/imageConverter';
import { DataFormatter } from './services/dataFormatter';
import type { ImageData, ConversionConfig, ConversionResult } from '../shared/types';
import AboutDialog from './components/AboutDialog';

export const App: React.FC = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [imagePath, setImagePath] = useState<string>('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [convertedPreviewUrl, setConvertedPreviewUrl] = useState<string>('');
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [previewData, setPreviewData] = useState<string>('');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  const [config, setConfig] = useState<ConversionConfig>({
    scanMode: 'horizontal',
    colorFormat: 'mono',
    maxWidth: 128,
    maxHeight: 64,
    invert: false,
    byteOrder: 'msb',
    includeHeader: false,
    identifierName: 'image_data',
    bytesPerLine: 16,
    dithering: false,
    brightness: 0,
    contrast: 0,
    rotation: 0,
    mirror: 'none',
    bitOrderInByte: 'msb-first',
    byteOrderInWord: 'pc-order',
    forwardScan: false,
    reverseScan: false,
    paletteType: 'rgb332',
    includePalette: false,
    color4096Format: '16bits-word',
    color16bitFormat: 'rgb565',
    color18bitFormat: '6bits-low-byte',
    rgbOrder: 'RGB'
  });

  const handleOpenFile = useCallback(async () => {
    try {
      const filePath = await window.electronAPI.openFile();
      if (filePath) {
        const result = await window.electronAPI.readImage(filePath);
        const imgData: ImageData = {
          data: new Uint8ClampedArray(result.data),
          width: result.width,
          height: result.height,
          format: result.format
        };
        setImageData(imgData);
        setImagePath(filePath);
        
        const canvas = document.createElement('canvas');
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageDataObj = ctx.createImageData(imgData.width, imgData.height);
          imageDataObj.data.set(imgData.data);
          ctx.putImageData(imageDataObj, 0, 0);
          const dataUrl = canvas.toDataURL();
          setImagePreviewUrl(dataUrl);
        }
        
        convertImage(imgData, config);
      }
    } catch (error) {
      alert('加载图片失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }, [config]);

  const convertImage = useCallback((imgData: ImageData, cfg: ConversionConfig) => {
    const converter = new ImageConverter();
    const result = converter.convert(imgData, cfg);
    setConversionResult(result);
    
    // 生成代码预览
    const formatter = new DataFormatter();
    const preview = formatter.formatAsCArray(result.data, cfg, result.metadata);
    setPreviewData(preview);
    
    // 生成转换后的图像预览
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const previewData = new Uint8ClampedArray(result.width * result.height * 4);
      
      // 根据颜色格式生成预览
      if (cfg.colorFormat === 'mono') {
        // 单色：将每个位转换为黑白像素
        for (let i = 0; i < result.data.length; i++) {
          const byte = result.data[i];
          for (let bit = 0; bit < 8; bit++) {
            const pixelIndex = i * 8 + bit;
            if (pixelIndex < result.width * result.height) {
              const isSet = (byte & (0x80 >> bit)) !== 0;
              const color = isSet ? 0 : 255; // 0=黑, 255=白
              const offset = pixelIndex * 4;
              previewData[offset] = color;     // R
              previewData[offset + 1] = color; // G
              previewData[offset + 2] = color; // B
              previewData[offset + 3] = 255;   // A
            }
          }
        }
      } else if (cfg.colorFormat === 'gray4') {
        // 4灰度：2位每像素，4像素每字节
        for (let i = 0; i < result.data.length; i++) {
          const byte = result.data[i];
          for (let pixel = 0; pixel < 4; pixel++) {
            const pixelIndex = i * 4 + pixel;
            if (pixelIndex < result.width * result.height) {
              const shift = (3 - pixel) * 2;
              const gray2bit = (byte >> shift) & 0x03;
              const gray = gray2bit * 85; // 0->0, 1->85, 2->170, 3->255
              const offset = pixelIndex * 4;
              previewData[offset] = gray;
              previewData[offset + 1] = gray;
              previewData[offset + 2] = gray;
              previewData[offset + 3] = 255;
            }
          }
        }
      } else if (cfg.colorFormat === 'gray16') {
        // 16灰度：4位每像素，2像素每字节
        for (let i = 0; i < result.data.length; i++) {
          const byte = result.data[i];
          for (let pixel = 0; pixel < 2; pixel++) {
            const pixelIndex = i * 2 + pixel;
            if (pixelIndex < result.width * result.height) {
              const shift = (1 - pixel) * 4;
              const gray4bit = (byte >> shift) & 0x0F;
              const gray = gray4bit * 17; // 0->0, 15->255
              const offset = pixelIndex * 4;
              previewData[offset] = gray;
              previewData[offset + 1] = gray;
              previewData[offset + 2] = gray;
              previewData[offset + 3] = 255;
            }
          }
        }
      } else if (cfg.colorFormat === 'grayscale' || cfg.colorFormat === 'color256') {
        // 256灰度或256色：直接使用字节值
        for (let i = 0; i < result.data.length && i < result.width * result.height; i++) {
          const value = result.data[i];
          const offset = i * 4;
          if (cfg.colorFormat === 'color256') {
            // 对于256色，使用RGB332解码
            const r = ((value >> 5) & 0x07) * 36; // 3位 -> 8位
            const g = ((value >> 2) & 0x07) * 36; // 3位 -> 8位
            const b = (value & 0x03) * 85;        // 2位 -> 8位
            previewData[offset] = r;
            previewData[offset + 1] = g;
            previewData[offset + 2] = b;
          } else {
            // 灰度
            previewData[offset] = value;
            previewData[offset + 1] = value;
            previewData[offset + 2] = value;
          }
          previewData[offset + 3] = 255;
        }
      } else if (cfg.colorFormat === 'color4096') {
        // 4096色：12位颜色
        if (cfg.color4096Format === '12bits-3bytes') {
          // 2像素每3字节
          for (let i = 0; i < result.data.length; i += 3) {
            const pixelIndex = Math.floor(i / 3) * 2;
            if (pixelIndex < result.width * result.height) {
              // 第一个像素
              const r1 = (result.data[i] >> 4) & 0x0F;
              const g1 = result.data[i] & 0x0F;
              const b1 = (result.data[i + 1] >> 4) & 0x0F;
              const offset1 = pixelIndex * 4;
              previewData[offset1] = r1 * 17;
              previewData[offset1 + 1] = g1 * 17;
              previewData[offset1 + 2] = b1 * 17;
              previewData[offset1 + 3] = 255;
              
              // 第二个像素
              if (pixelIndex + 1 < result.width * result.height) {
                const r2 = result.data[i + 1] & 0x0F;
                const g2 = (result.data[i + 2] >> 4) & 0x0F;
                const b2 = result.data[i + 2] & 0x0F;
                const offset2 = (pixelIndex + 1) * 4;
                previewData[offset2] = r2 * 17;
                previewData[offset2 + 1] = g2 * 17;
                previewData[offset2 + 2] = b2 * 17;
                previewData[offset2 + 3] = 255;
              }
            }
          }
        } else {
          // 16位WORD格式
          for (let i = 0; i < result.data.length; i += 2) {
            const pixelIndex = i / 2;
            if (pixelIndex < result.width * result.height) {
              const color = (result.data[i] << 8) | result.data[i + 1];
              const r = ((color >> 8) & 0x0F) * 17;
              const g = ((color >> 4) & 0x0F) * 17;
              const b = (color & 0x0F) * 17;
              const offset = pixelIndex * 4;
              previewData[offset] = r;
              previewData[offset + 1] = g;
              previewData[offset + 2] = b;
              previewData[offset + 3] = 255;
            }
          }
        }
      } else if (cfg.colorFormat === 'color16bit' || cfg.colorFormat === 'rgb565') {
        // 16位真彩色：RGB565或RGB555
        const isRGB565 = cfg.color16bitFormat === 'rgb565';
        for (let i = 0; i < result.data.length; i += 2) {
          const pixelIndex = i / 2;
          if (pixelIndex < result.width * result.height) {
            const color = (result.data[i] << 8) | result.data[i + 1];
            let r, g, b;
            if (isRGB565) {
              r = ((color >> 11) & 0x1F) << 3;
              g = ((color >> 5) & 0x3F) << 2;
              b = (color & 0x1F) << 3;
            } else {
              // RGB555
              r = ((color >> 10) & 0x1F) << 3;
              g = ((color >> 5) & 0x1F) << 3;
              b = (color & 0x1F) << 3;
            }
            const offset = pixelIndex * 4;
            previewData[offset] = r;
            previewData[offset + 1] = g;
            previewData[offset + 2] = b;
            previewData[offset + 3] = 255;
          }
        }
      } else if (cfg.colorFormat === 'color18bit') {
        // 18位真彩色：6位每分量
        for (let i = 0; i < result.data.length; i += 3) {
          const pixelIndex = i / 3;
          if (pixelIndex < result.width * result.height) {
            let r, g, b;
            if (cfg.color18bitFormat === '6bits-low-byte') {
              r = result.data[i] << 2;
              g = result.data[i + 1] << 2;
              b = result.data[i + 2] << 2;
            } else {
              r = result.data[i] >> 2;
              g = result.data[i + 1] >> 2;
              b = result.data[i + 2] >> 2;
            }
            const offset = pixelIndex * 4;
            previewData[offset] = r;
            previewData[offset + 1] = g;
            previewData[offset + 2] = b;
            previewData[offset + 3] = 255;
          }
        }
      } else if (cfg.colorFormat === 'color24bit' || cfg.colorFormat === 'rgb888') {
        // 24位真彩色：直接复制（考虑RGB顺序）
        for (let i = 0; i < result.data.length; i += 3) {
          const pixelIndex = i / 3;
          if (pixelIndex < result.width * result.height) {
            const offset = pixelIndex * 4;
            previewData[offset] = result.data[i];
            previewData[offset + 1] = result.data[i + 1];
            previewData[offset + 2] = result.data[i + 2];
            previewData[offset + 3] = 255;
          }
        }
      } else if (cfg.colorFormat === 'color32bit') {
        // 32位真彩色：直接复制包括alpha
        for (let i = 0; i < result.data.length; i += 4) {
          const pixelIndex = i / 4;
          if (pixelIndex < result.width * result.height) {
            const offset = pixelIndex * 4;
            previewData[offset] = result.data[i];
            previewData[offset + 1] = result.data[i + 1];
            previewData[offset + 2] = result.data[i + 2];
            previewData[offset + 3] = result.data[i + 3];
          }
        }
      }
      
      const imageDataObj = ctx.createImageData(result.width, result.height);
      imageDataObj.data.set(previewData);
      ctx.putImageData(imageDataObj, 0, 0);
      const dataUrl = canvas.toDataURL();
      setConvertedPreviewUrl(dataUrl);
    }
  }, []);

  const handleConfigChange = useCallback((updates: Partial<ConversionConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    if (imageData) {
      convertImage(imageData, newConfig);
    }
  }, [config, imageData, convertImage]);

  const handleSave = useCallback(async () => {
    if (!conversionResult) {
      alert('请先加载并转换图片');
      return;
    }

    try {
      const defaultName = config.identifierName + '.c';
      const filePath = await window.electronAPI.saveFile(defaultName);
      if (filePath) {
        const formatter = new DataFormatter();
        const output = formatter.formatAsCArray(
          conversionResult.data,
          config,
          conversionResult.metadata
        );
        await window.electronAPI.writeFile(filePath, output);
        alert('保存成功！');
      }
    } catch (error) {
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }, [conversionResult, config]);

  return (
    <div className="app">
      <AboutDialog isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      {/* 工具栏 */}
      <div className="toolbar">
        <button className="toolbar-btn" onClick={handleOpenFile}>
          <div className="toolbar-icon">📂</div>
          <div className="toolbar-label">打开</div>
        </button>
        <button className="toolbar-btn" onClick={handleSave} disabled={!conversionResult}>
          <div className="toolbar-icon">💾</div>
          <div className="toolbar-label">保存</div>
        </button>
        <div className="toolbar-separator"></div>
        <button className="toolbar-btn">
          <div className="toolbar-icon">⚙️</div>
          <div className="toolbar-label">设置</div>
        </button>
        <button className="toolbar-btn">
          <div className="toolbar-icon">🔄</div>
          <div className="toolbar-label">重新载入</div>
        </button>
        <div className="toolbar-separator"></div>
        <button className="toolbar-btn">
          <div className="toolbar-icon">⬅️</div>
          <div className="toolbar-label">上一幅</div>
        </button>
        <button className="toolbar-btn">
          <div className="toolbar-icon">➡️</div>
          <div className="toolbar-label">下一幅</div>
        </button>
        <div className="toolbar-separator"></div>
        <button className="toolbar-btn">
          <div className="toolbar-icon">❓</div>
          <div className="toolbar-label">帮助</div>
        </button>
        <button className="toolbar-btn" onClick={() => setIsAboutOpen(true)}>
          <div className="toolbar-icon">ℹ️</div>
          <div className="toolbar-label">关于</div>
        </button>
      </div>

      <div className="main-layout">
        {/* 左侧配置面板 */}
        <div className="left-config">
          {/* 扫描模式图示 */}
          <div className="scan-diagram">
            <svg width="150" height="100" viewBox="0 0 150 100">
              <rect x="20" y="20" width="110" height="60" fill="none" stroke="#000" strokeWidth="2"/>
              {config.scanMode === 'horizontal' && (
                <>
                  <line x1="30" y1="30" x2="120" y2="30" stroke="#ff0000" strokeWidth="2"/>
                  <line x1="30" y1="40" x2="120" y2="40" stroke="#0000ff" strokeWidth="2"/>
                  <line x1="30" y1="50" x2="120" y2="50" stroke="#ff0000" strokeWidth="2"/>
                  <line x1="30" y1="60" x2="120" y2="60" stroke="#0000ff" strokeWidth="2"/>
                  <line x1="30" y1="70" x2="120" y2="70" stroke="#ff0000" strokeWidth="2"/>
                  <path d="M 130 30 L 140 25 L 140 35 Z" fill="#000"/>
                  <path d="M 130 70 L 140 65 L 140 75 Z" fill="#000"/>
                </>
              )}
              {config.scanMode === 'vertical' && (
                <>
                  <line x1="30" y1="30" x2="30" y2="70" stroke="#ff0000" strokeWidth="2"/>
                  <line x1="45" y1="30" x2="45" y2="70" stroke="#0000ff" strokeWidth="2"/>
                  <line x1="60" y1="30" x2="60" y2="70" stroke="#ff0000" strokeWidth="2"/>
                  <line x1="75" y1="30" x2="75" y2="70" stroke="#0000ff" strokeWidth="2"/>
                  <line x1="90" y1="30" x2="90" y2="70" stroke="#ff0000" strokeWidth="2"/>
                  <path d="M 30 15 L 25 5 L 35 5 Z" fill="#000"/>
                  <path d="M 90 15 L 85 5 L 95 5 Z" fill="#000"/>
                </>
              )}
            </svg>
          </div>

          {/* 输出数据类型 */}
          <div className="form-group">
            <label>输出数据类型:</label>
            <select value="c" onChange={() => {}}>
              <option value="c">C语言数组(*.c)</option>
              <option value="bin">二进制文件(*.bin)</option>
            </select>
          </div>

          {/* 扫描模式 */}
          <div className="form-group">
            <label>扫描模式:</label>
            <select 
              value={config.scanMode} 
              onChange={(e) => handleConfigChange({ scanMode: e.target.value as any })}
            >
              <option value="horizontal">水平扫描</option>
              <option value="vertical">垂直扫描</option>
              <option value="horizontal-reverse-byte-vertical">水平反向字节垂直</option>
              <option value="data-vertical-byte-horizontal">数据垂直字节水平</option>
            </select>
          </div>

          {/* 输出灰度 */}
          <div className="form-group">
            <label>输出灰度:</label>
            <select 
              value={config.colorFormat} 
              onChange={(e) => handleConfigChange({ colorFormat: e.target.value as any })}
            >
              <option value="mono">单色 (1位)</option>
              <option value="gray4">4灰度 (2位)</option>
              <option value="gray16">16灰度 (4位)</option>
              <option value="grayscale">256灰度 (8位)</option>
              <option value="color256">256色 (8位)</option>
              <option value="color4096">4096色 (12位)</option>
              <option value="color16bit">16位真彩色</option>
              <option value="color18bit">18位真彩色</option>
              <option value="color24bit">24位真彩色</option>
              <option value="color32bit">32位真彩色</option>
            </select>
          </div>

          {/* Format-specific options */}
          {config.colorFormat === 'color256' && (
            <div className="form-group">
              <label>调色板类型:</label>
              <select 
                value={config.paletteType || 'rgb332'} 
                onChange={(e) => handleConfigChange({ paletteType: e.target.value as any })}
              >
                <option value="rgb332">RGB332</option>
                <option value="grayscale">灰度</option>
                <option value="custom">自定义</option>
              </select>
              <label style={{ marginLeft: '10px' }}>
                <input 
                  type="checkbox" 
                  checked={config.includePalette || false} 
                  onChange={(e) => handleConfigChange({ includePalette: e.target.checked })}
                />
                包含调色板
              </label>
            </div>
          )}

          {config.colorFormat === 'color4096' && (
            <div className="form-group">
              <label>4096色格式:</label>
              <select 
                value={config.color4096Format || '16bits-word'} 
                onChange={(e) => handleConfigChange({ color4096Format: e.target.value as any })}
              >
                <option value="16bits-word">16位WORD</option>
                <option value="12bits-3bytes">12位3字节</option>
              </select>
            </div>
          )}

          {config.colorFormat === 'color16bit' && (
            <div className="form-group">
              <label>16位格式:</label>
              <select 
                value={config.color16bitFormat || 'rgb565'} 
                onChange={(e) => handleConfigChange({ color16bitFormat: e.target.value as any })}
              >
                <option value="rgb565">RGB565</option>
                <option value="rgb555">RGB555</option>
              </select>
            </div>
          )}

          {config.colorFormat === 'color18bit' && (
            <div className="form-group">
              <label>18位格式:</label>
              <select 
                value={config.color18bitFormat || '6bits-low-byte'} 
                onChange={(e) => handleConfigChange({ color18bitFormat: e.target.value as any })}
              >
                <option value="6bits-low-byte">6位低字节</option>
                <option value="6bits-high-byte">6位高字节</option>
              </select>
            </div>
          )}

          {['color24bit', 'color32bit'].includes(config.colorFormat) && (
            <div className="form-group">
              <label>RGB顺序:</label>
              <select 
                value={config.rgbOrder || 'RGB'} 
                onChange={(e) => handleConfigChange({ rgbOrder: e.target.value as any })}
              >
                <option value="RGB">RGB</option>
                <option value="RBG">RBG</option>
                <option value="GRB">GRB</option>
                <option value="GBR">GBR</option>
                <option value="BRG">BRG</option>
                <option value="BGR">BGR</option>
              </select>
            </div>
          )}

          {/* 最大宽度和高度 */}
          <div className="form-group">
            <label>最大宽度和高度:</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="number" 
                value={config.maxWidth} 
                onChange={(e) => handleConfigChange({ maxWidth: parseInt(e.target.value) })}
                style={{ width: '70px' }}
              />
              <input 
                type="number" 
                value={config.maxHeight} 
                onChange={(e) => handleConfigChange({ maxHeight: parseInt(e.target.value) })}
                style={{ width: '70px' }}
              />
              <button className="btn-secondary" style={{ padding: '3px 8px' }}>▶</button>
            </div>
          </div>

          {/* 复选框选项 */}
          <div className="checkbox-group">
            <label>
              <input 
                type="checkbox" 
                checked={config.includeHeader} 
                onChange={(e) => handleConfigChange({ includeHeader: e.target.checked })}
              />
              包含图像头数据
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={config.reverseScan || false} 
                onChange={(e) => handleConfigChange({ reverseScan: e.target.checked })}
              />
              水平反向扫描
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={config.forwardScan || false} 
                onChange={(e) => handleConfigChange({ forwardScan: e.target.checked })}
              />
              垂直反向扫描
            </label>
            <label>
              字节序:
              <select 
                value={config.byteOrderInWord || 'pc-order'} 
                onChange={(e) => handleConfigChange({ byteOrderInWord: e.target.value as any })}
                style={{ marginLeft: '5px' }}
              >
                <option value="pc-order">PC顺序</option>
                <option value="reverse-order">反序(MSB First)</option>
              </select>
            </label>
            <label>
              位序:
              <select 
                value={config.bitOrderInByte || 'msb-first'} 
                onChange={(e) => handleConfigChange({ bitOrderInByte: e.target.value as any })}
                style={{ marginLeft: '5px' }}
              >
                <option value="msb-first">MSB优先</option>
                <option value="lsb-first">LSB优先</option>
              </select>
            </label>
          </div>
        </div>

        {/* 中间预览区域 */}
        <div className="center-preview">
          <div className="preview-container">
            <div className="preview-pane">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="原图" />
              ) : (
                <div className="preview-placeholder">原图预览</div>
              )}
            </div>
            <div className="preview-pane">
              {convertedPreviewUrl ? (
                <img src={convertedPreviewUrl} alt="转换后" />
              ) : (
                <div className="preview-placeholder">转换后预览</div>
              )}
            </div>
          </div>

          {/* 底部控制区 */}
          <div className="bottom-controls">
            <div className="control-row">
              <button className="btn-secondary">恢复默认值</button>
              <label>
                <input 
                  type="checkbox" 
                  checked={config.invert} 
                  onChange={(e) => handleConfigChange({ invert: e.target.checked })}
                />
                颜色反转
              </label>
              <label>
                镜像:
                <select 
                  value={config.mirror || 'none'} 
                  onChange={(e) => handleConfigChange({ mirror: e.target.value as any })}
                  style={{ marginLeft: '5px' }}
                >
                  <option value="none">无</option>
                  <option value="horizontal">水平</option>
                  <option value="vertical">垂直</option>
                  <option value="both">水平+垂直</option>
                </select>
              </label>
            </div>

            <div className="slider-row">
              <label>亮度:</label>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={config.brightness} 
                onChange={(e) => handleConfigChange({ brightness: parseInt(e.target.value) })}
              />
            </div>

            <div className="slider-row">
              <label>对比度:</label>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={config.contrast} 
                onChange={(e) => handleConfigChange({ contrast: parseInt(e.target.value) })}
              />
            </div>

            <div className="button-row">
              {/* 颜色格式快速切换按钮 - 可根据需要添加功能 */}
              {/* <button className="btn-secondary">输出图像调整</button> */}
            </div>
          </div>
        </div>

        {/* 右侧代码预览 */}
        <div className="right-code">
          <div className="code-preview">
            <pre>{previewData || '// 请先加载图片'}</pre>
          </div>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="statusbar">
        <div>
          输入图像: {imagePath ? `${imagePath.split('/').pop()} (${imageData?.width},${imageData?.height})` : '无'}
        </div>
        <div>
          输出图像: {conversionResult ? `(${conversionResult.width},${conversionResult.height})` : '无'}
        </div>
      </div>
    </div>
  );
};
