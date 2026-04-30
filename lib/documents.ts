import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

export interface StoredDocument {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  name: string;
  type: string;
  url: string;
  size: number | null;
  created_at: string;
}

export const getDocuments = async (userId: string): Promise<StoredDocument[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('id, user_id, vehicle_id, name, type, url, size, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[documents] getDocuments:', error);
    return [];
  }
  return (data ?? []) as StoredDocument[];
};

export const uploadDocument = async (
  docType: string, // 'Insurance' | 'Driver\'s License' | 'Registration'
  userId: string,
  vehicleId?: string | null
): Promise<StoredDocument | null> => {
  try {
    // 1. Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const uri = asset.uri;

    // 2. Build file name
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const timestamp = Date.now();
    const safeType = docType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${safeType}_${timestamp}.${ext}`;
    const storagePath = `${userId}/${fileName}`;

    // 3. Read as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // 4. Convert to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 5. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, bytes, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: true,
      });

    if (uploadError) {
      console.error('[documents] upload error:', uploadError);
      return null;
    }

    // 6. Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // 7. Insert record
    const { data: row, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        vehicle_id: vehicleId ?? null,
        name: fileName,
        type: docType,
        url: publicUrl,
        size: asset.fileSize ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[documents] insert error:', insertError);
      return null;
    }

    return row as StoredDocument;
  } catch (err) {
    console.error('[documents] unexpected error:', err);
    return null;
  }
};

export const deleteDocument = async (doc: StoredDocument): Promise<boolean> => {
  try {
    // Extract storage path from URL
    const urlParts = doc.url.split('/documents/');
    const storagePath = urlParts[1]?.split('?')[0];

    if (storagePath) {
      await supabase.storage.from('documents').remove([storagePath]);
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (error) {
      console.error('[documents] delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[documents] delete unexpected error:', err);
    return false;
  }
};

export const getDocumentCount = async (): Promise<number> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error) return 0;
  return count ?? 0;
};
