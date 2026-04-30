import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export const pickAndUploadVehiclePhoto = async (
  vehicleId: string,
  userId: string
): Promise<string | null> => {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (result.canceled) return null;

    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${vehicleId}.${ext}`;
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    // Read as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // Decode base64 to ArrayBuffer
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const { data, error } = await supabase.storage
      .from('vehicule-photos')
      .upload(fileName, byteArray, {
        contentType,
        upsert: true,
      });

    console.log('Upload result:', data, error);
    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('vehicule-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (e) {
    console.error('Photo upload error:', e);
    return null;
  }
};
