"use client";

import { useState, useRef } from "react";
import ToolLayout from "@/components/ToolLayout";
import { QrCode, Download, Type, Smartphone } from "lucide-react";
import QRCode from "qrcode";

export default function QRGenerator() {
  const [text, setText] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [size, setSize] = useState(256);
  const [errorLevel, setErrorLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateQRCode = async () => {
    if (!text.trim()) {
      alert("Please enter text or URL to generate QR code");
      return;
    }

    setIsLoading(true);

    try {
      const canvas = canvasRef.current;
      if (canvas) {
        await QRCode.toCanvas(canvas, text, {
          width: size,
          margin: 2,
          color: {
            dark: foregroundColor,
            light: backgroundColor,
          },
          errorCorrectionLevel: errorLevel,
        });

        // Create data URL for download
        const dataUrl = canvas.toDataURL('image/png');
        setQrCodeUrl(dataUrl);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code. Please check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = (format: 'png' | 'svg') => {
    if (format === 'png' && qrCodeUrl) {
      const link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = qrCodeUrl;
      link.click();
    } else if (format === 'svg') {
      QRCode.toString(text, {
        type: 'svg',
        width: size,
        margin: 2,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        errorCorrectionLevel: errorLevel,
      }).then((svgString) => {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'qrcode.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }).catch((error) => {
        console.error('Error generating SVG:', error);
        alert('Failed to generate SVG QR code.');
      });
    }
  };

  const errorLevelDescriptions = {
    L: "Low (7%)",
    M: "Medium (15%)",
    Q: "Quartile (25%)",
    H: "High (30%)",
  };

  return (
    <ToolLayout
      title="QR Code Generator"
      description="Generate customizable QR codes for URLs, text, or any data"
    >
      <div className="space-y-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Text or URL to encode
            </label>
            <div className="relative">
              <Type className="absolute left-3 top-3 text-gray-400" size={20} />
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter URL, text, or any data to generate QR code..."
                rows={3}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {text.length} characters
            </p>
          </div>

          {/* Customization Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Size (px)
              </label>
              <select
                id="size"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={128}>128x128</option>
                <option value={256}>256x256</option>
                <option value={512}>512x512</option>
                <option value={1024}>1024x1024</option>
              </select>
            </div>

            <div>
              <label htmlFor="errorLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Error Correction
              </label>
              <select
                id="errorLevel"
                value={errorLevel}
                onChange={(e) => setErrorLevel(e.target.value as "L" | "M" | "Q" | "H")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(errorLevelDescriptions).map(([level, description]) => (
                  <option key={level} value={level}>
                    {description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="foregroundColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Foreground Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  id="foregroundColor"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Background Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  id="backgroundColor"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <button
            onClick={generateQRCode}
            disabled={!text.trim() || isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <QrCode size={20} />
                <span>Generate QR Code</span>
              </>
            )}
          </button>
        </div>

        {/* Keep the canvas mounted so the first generation has a drawing target. */}
        <div className={qrCodeUrl ? "space-y-6" : "hidden"} aria-hidden={!qrCodeUrl}>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
              <div className="flex flex-col items-center space-y-4">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => downloadQRCode('png')}
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    <Download size={18} />
                    <span>Download PNG</span>
                  </button>
                  <button
                    onClick={() => downloadQRCode('svg')}
                    className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    <Download size={18} />
                    <span>Download SVG</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Smartphone className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Usage Tips</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Test your QR code with multiple devices and apps</li>
                    <li>• Higher error correction allows scanning even if partially damaged</li>
                    <li>• PNG format is best for web use, SVG for print and scaling</li>
                    <li>• Ensure sufficient contrast between foreground and background colors</li>
                  </ul>
                </div>
              </div>
            </div>
        </div>
      </div>
    </ToolLayout>
  );
}
