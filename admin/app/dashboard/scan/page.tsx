'use client';

import { couponsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { AlertCircle, Camera, CheckCircle, Gift, QrCode, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface VerificationResult {
  success: boolean;
  message: string;
  coupon_name?: string;
  company_name?: string;
  user_id?: number;
  points_spent?: number;
}

export default function ScanPage() {
  const {isRTL, language} = useLanguage();
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check if camera is available
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices()
          .then(devices => {
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            setHasCamera(videoDevices.length > 0);
          })
          .catch(() => setHasCamera(false));
    }

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);

      // Check if we're on HTTPS or localhost (required for camera access)
      const isSecureContext = window.isSecureContext;
      if (!isSecureContext) {
        setError(language === 'ar' ? 'الكاميرا تتطلب اتصال HTTPS آمن. استخدم الإدخال اليدوي.' : language === 'ku' ? 'Kamera pêwendiyeke HTTPS-ê ya ewle dixwaze. Ji kerema xwe têketina destanî bi kar bîne.' : 'Camera requires secure HTTPS connection. Please use manual entry.');
        setHasCamera(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);

        // Start scanning for QR codes
        requestAnimationFrame(scanQRCode);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError(language === 'ar' ? 'لا يمكن الوصول إلى الكاميرا' : language === 'ku' ? 'Nikare bigihîje kamerayê' : 'Cannot access camera');
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanQRCode = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        // @ts-ignore
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        barcodeDetector.detect(canvas)
            .then((barcodes: any[]) => {
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                stopCamera();
                verifyCode(code);
              } else {
                requestAnimationFrame(scanQRCode);
              }
            })
            .catch(() => {
              requestAnimationFrame(scanQRCode);
            });
      } else {
        // Fallback: just keep scanning (user can enter code manually)
        requestAnimationFrame(scanQRCode);
      }
    } else {
      requestAnimationFrame(scanQRCode);
    }
  };

  const verifyCode = async (code: string) => {
    if (!code.trim()) {
      setError(language === 'ar' ? 'الرجاء إدخال الكود' : language === 'ku' ? 'Ji kerema xwe kodê binivîse' : 'Please enter a code');
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      setResult(null);

      const response = await couponsAPI.verifyRedemption(code.trim());
      setResult(response);
      setManualCode('');
    } catch (err: any) {
      console.error('Verification error:', err);
      setResult({
        success: false,
        message: err.response?.data?.detail || (language === 'ar' ? 'فشل التحقق' : language === 'ku' ? 'Verastkirin têk çû' : 'Verification failed')
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(manualCode);
  };

  const resetScan = () => {
    setResult(null);
    setError(null);
    setManualCode('');
  };

  return (
      <div className="max-w-2xl mx-auto">
        <div className={`mb-6 ${isRTL ? 'text-right' : ''}`}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {language === 'ar' ? 'مسح كوبون' : language === 'ku' ? 'Kuponê Sken Bike' : 'Scan Coupon'}
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            {language === 'ar' ? 'امسح رمز QR للتحقق من كوبون العميل' : language === 'ku' ? 'Koda QR-ê sken bike da ku kupona xerîdar verast bike' : 'Scan QR code to verify customer coupon'}
          </p>
        </div>

        {/* Result Display */}
        {result && (
            <div className={`mb-6 p-4 sm:p-6 rounded-xl ${result.success ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`p-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`}>
                  {result.success ? (
                      <CheckCircle className="w-8 h-8 text-white" />
                  ) : (
                      <XCircle className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                  <h3 className={`text-xl font-bold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.success
                        ? (language === 'ar' ? 'تم التحقق بنجاح!' : language === 'ku' ? 'Bi serkeftin verast bû!' : 'Verified Successfully!')
                        : (language === 'ar' ? 'فشل التحقق' : language === 'ku' ? 'Verastkirin têk çû' : 'Verification Failed')}
                  </h3>
                  <p className={`mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.message}
                  </p>

                  {result.success && result.coupon_name && (
                      <div className="mt-4 space-y-2">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Gift className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-800">{result.coupon_name}</span>
                        </div>
                        {result.points_spent && (
                            <p className="text-sm text-green-600">
                              {language === 'ar' ? `النقاط المستخدمة: ${result.points_spent}` : language === 'ku' ? `Xalên hatine bikaranîn: ${result.points_spent}` : `Points spent: ${result.points_spent}`}
                            </p>
                        )}
                      </div>
                  )}
                </div>
                <button
                    onClick={resetScan}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {result.success && (
                  <button
                      onClick={resetScan}
                      className="mt-4 w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                  >
                    {language === 'ar' ? 'مسح كوبون آخر' : language === 'ku' ? 'Kuponê din sken bike' : 'Scan Another Coupon'}
                  </button>
              )}
            </div>
        )}

        {/* Error Display */}
        {error && !result && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
        )}

        {!result && (
            <>
              {/* Camera Scanner */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
                <h2 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
                  {language === 'ar' ? 'مسح رمز QR' : language === 'ku' ? 'Koda QR-ê Sken Bike' : 'Scan QR Code'}
                </h2>

                {isScanning ? (
                    <div className="relative">
                      <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full rounded-lg bg-black aspect-square object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Scanning overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-4 border-purple-500 rounded-2xl animate-pulse" />
                      </div>

                      <button
                          onClick={stopCamera}
                          className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <p className="text-center mt-4 text-gray-600">
                        {language === 'ar' ? 'وجه الكاميرا نحو رمز QR' : language === 'ku' ? 'Kamerayê ber bi koda QR-ê ve bigire' : 'Point camera at QR code'}
                      </p>
                    </div>
                ) : (
                    <div className="text-center">
                      {hasCamera ? (
                          <button
                              onClick={startCamera}
                              className="inline-flex items-center gap-3 px-6 py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition"
                          >
                            <Camera className="w-6 h-6" />
                            <span>{language === 'ar' ? 'فتح الكاميرا' : language === 'ku' ? 'Kamerayê veke' : 'Open Camera'}</span>
                          </button>
                      ) : (
                          <div className="py-8 text-gray-500">
                            <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>{language === 'ar' ? 'الكاميرا غير متوفرة' : language === 'ku' ? 'Kamera ne berdest e' : 'Camera not available'}</p>
                            <p className="text-sm mt-1">
                              {language === 'ar' ? 'استخدم الإدخال اليدوي أدناه' : language === 'ku' ? 'Têketina destanî ya li jêr bi kar bîne' : 'Use manual entry below'}
                            </p>
                          </div>
                      )}
                    </div>
                )}
              </div>

              {/* Manual Code Entry */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h2 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
                  {language === 'ar' ? 'إدخال الكود يدوياً' : language === 'ku' ? 'Kodê bi destanî binivîse' : 'Enter Code Manually'}
                </h2>

                <form onSubmit={handleManualSubmit}>
                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-1 relative">
                      <QrCode className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <input
                          type="text"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                          placeholder={language === 'ar' ? 'أدخل كود التحقق' : language === 'ku' ? 'Kodê verastkirinê binivîse' : 'Enter verification code'}
                          className={`w-full border border-gray-300 rounded-lg py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
                          disabled={verifying}
                      />
                    </div>
                    <button
                        type="submit"
                        disabled={verifying || !manualCode.trim()}
                        className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {verifying ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                      ) : (
                          language === 'ar' ? 'تحقق' : language === 'ku' ? 'Verast bike' : 'Verify'
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Instructions */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className={`font-semibold text-blue-900 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {language === 'ar' ? 'كيفية الاستخدام:' : language === 'ku' ? 'Çawa tê bikaranîn:' : 'How to use:'}
                </h3>
                <ul className={`text-sm text-blue-800 space-y-1 ${isRTL ? 'text-right' : ''}`}>
                  <li>{language === 'ar' ? '1. اطلب من العميل عرض رمز QR الخاص بالكوبون' : language === 'ku' ? '1. Ji xerîdar bixwaze ku koda QR-ê ya kupona xwe nîşan bide' : '1. Ask customer to show their coupon QR code'}</li>
                  <li>{language === 'ar' ? '2. امسح الرمز باستخدام الكاميرا أو أدخل الكود يدوياً' : language === 'ku' ? '2. Kodê bi kamerayê sken bike an jî bi destanî têkevin' : '2. Scan the code using camera or enter manually'}</li>
                  <li>{language === 'ar' ? '3. تأكد من نجاح التحقق قبل تقديم الخصم' : language === 'ku' ? '3. Berî pêşkêşkirina daxistinê, verastkirinê piştrast bike' : '3. Confirm verification before applying discount'}</li>
                </ul>
              </div>
            </>
        )}
      </div>
  );
}
