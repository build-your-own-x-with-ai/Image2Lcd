import React from 'react';
import qrCodeImage from '../assets/AIDevLog.jpg';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>关于 Image2LCD Converter</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="about-content">
            <div className="qr-section" style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ margin: '10px 0', fontWeight: 'bold' }}>关注微信公众号 AIDevLog 获取更多AI开发资讯</p>
              <img src={qrCodeImage} alt="AIDevLog QR Code" style={{ width: '150px', height: '150px' }} />
              <p style={{ margin: '10px 0', fontSize: '14px' }}>
                项目源码地址：<a href="https://github.com/build-your-own-x-with-ai/Image2Lcd" target="_blank" rel="noopener noreferrer" style={{ color: '#007acc' }}>GitHub Repository</a>
              </p>
            </div>
            
            <div className="logo-section">
              <div className="app-logo">🖼️</div>
              <div className="app-name">Image2LCD Converter</div>
              <div className="app-version">版本 1.0.0</div>
            </div>
            
            <div className="description">
              <p>一个功能强大的桌面应用程序和CLI工具，用于将图像转换为LCD显示数据格式，专为嵌入式系统和微控制器项目设计。</p>
              <p>完全兼容Image2Lcd格式规范。</p>
            </div>
            
            <div className="features">
              <h3>主要特性</h3>
              <ul>
                <li>支持10种颜色格式：单色、4灰度、16灰度、256灰度、256色、4096色、16位、18位、24位、32位真彩色</li>
                <li>图像预处理功能：调整大小、旋转、镜像、亮度、对比度、反色</li>
                <li>抖动算法：Floyd-Steinberg和有序抖动（用于单色）</li>
                <li>4种扫描模式：水平、垂直、水平反向字节垂直、数据垂直字节水平</li>
                <li>Image2Lcd头部结构：HEADGRAY、HEADCOLOR和PALETTE结构</li>
                <li>位/字节顺序控制：MSB/LSB位顺序，PC/反序字节顺序</li>
                <li>多种输出格式：C数组、二进制、十六进制文本</li>
              </ul>
            </div>
            
            <div className="copyright">
              <p>© 2025 Image2LCD Converter. 保留所有权利。</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>确定</button>
        </div>
      </div>
    </div>
  );
};

export default AboutDialog;