import { Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

let GoogleSignin: any = null;
try {
  // Dynamically require so Expo Go doesn't crash when the native module is missing
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    iosClientId: '444087067992-og9qic1c23aetvruae7ncpai834vbppj.apps.googleusercontent.com',
  });
} catch (e) {
  // Running in an environment (like Expo Go) without the native module
  console.log('GoogleSignin native module not available');
}

export const signInWithApple = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const idToken = credential.identityToken;
    if (!idToken) throw new Error('No identity token returned');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === 'ERR_REQUEST_CANCELED') {
      return { data: null, error: null };
    }
    return { data: null, error: error as Error };
  }
};

export const signInWithGoogle = async () => {
  if (!GoogleSignin) {
    Alert.alert('Not Available', 'Google Sign-In requires a development build.');
    return { data: null, error: null };
  }

  try {
    // Generate a nonce
    const rawNonce = await Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn({
      nonce: hashedNonce,
    });

    const idToken = userInfo.data?.idToken;
    if (!idToken) throw new Error('No ID token returned');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce: rawNonce,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: unknown) {
    console.error('Google Sign-In error:', error);
    return { data: null, error: error as Error };
  }
};
