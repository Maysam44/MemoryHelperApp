// hooks/use-location-tracking.ts

import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';

const LOCATION_TASK_NAME = 'PATIENT_LOCATION_TRACKING';

// تعريف المهمة الخلفية لتتبع الموقع
if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('خطأ في تتبع الموقع:', error);
      return;
    }
    if (data) {
      const { locations } = data as any;
      console.log('الموقع الحالي:', locations[0]);
      // هنا يمكنك إرسال الموقع إلى Firebase
    }
  });
}

export interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // بالمتر
}

export const useLocationTracking = () => {
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // طلب إذن الموقع
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const hasPermission = status === 'granted';
      setLocationPermission(hasPermission);
      return hasPermission;
    } catch (error) {
      console.error('خطأ في طلب إذن الموقع:', error);
      return false;
    }
  };

  // بدء تتبع الموقع
  const startLocationTracking = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        console.warn('لم يتم منح إذن الموقع');
        return;
      }

      setIsTracking(true);

      // الحصول على الموقع الحالي
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location);

      // الاستماع إلى تحديثات الموقع
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // تحديث كل 5 ثوان
          distanceInterval: 10, // أو عند تحرك 10 متر
        },
        (location) => {
          setCurrentLocation(location);
        }
      );
    } catch (error) {
      console.error('خطأ في بدء تتبع الموقع:', error);
      setIsTracking(false);
    }
  };

  // إيقاف تتبع الموقع
  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  // حساب المسافة بين نقطتين (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000; // نصف قطر الأرض بالمتر
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // التحقق من كون الموقع الحالي داخل منطقة آمنة
  const isInSafeZone = (safeZones: SafeZone[]): SafeZone | null => {
    if (!currentLocation) return null;

    for (const zone of safeZones) {
      const distance = calculateDistance(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        zone.latitude,
        zone.longitude
      );

      if (distance <= zone.radius) {
        return zone;
      }
    }

    return null;
  };

  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  return {
    currentLocation,
    isTracking,
    locationPermission,
    startLocationTracking,
    stopLocationTracking,
    calculateDistance,
    isInSafeZone,
  };
};
