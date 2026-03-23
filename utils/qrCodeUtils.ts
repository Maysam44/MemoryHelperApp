/**
 * QR Code Utilities
 * يحتوي على دوال لتوليد ومسح رموز QR لربط المريض بمقدم الرعاية
 */

/**
 * توليد بيانات QR لمقدم الرعاية
 * @param caregiverId - معرف مقدم الرعاية (UID)
 * @returns JSON string يحتوي على بيانات الربط
 */
export const generateQRData = (caregiverId: string): string => {
  const qrData = {
    type: 'caregiver_link',
    caregiverId: caregiverId,
    timestamp: new Date().getTime(),
  };
  return JSON.stringify(qrData);
};

/**
 * فك تشفير بيانات QR
 * @param qrData - بيانات QR المفحوصة
 * @returns كائن يحتوي على معرف مقدم الرعاية
 */
export const parseQRData = (qrData: string): { caregiverId: string } | null => {
  try {
    const data = JSON.parse(qrData);
    if (data.type === 'caregiver_link' && data.caregiverId) {
      return { caregiverId: data.caregiverId };
    }
    return null;
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
};
