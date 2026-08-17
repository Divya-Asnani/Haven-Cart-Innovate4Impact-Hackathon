import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { MapPin, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { api } from '../api';

export const LocationSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCurrentLocation = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        setAddress(`${place.name || ''} ${place.street || ''}`.trim() || place.district || '');
        setCity(place.city || place.subregion || '');
      }

      // Update backend immediately with coords
      await api.updateLocation({
        address: `${geocode[0]?.name || ''} ${geocode[0]?.street || ''}`.trim(),
        city: geocode[0]?.city || '',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      setSuccess('Location updated successfully!');
    } catch (err: any) {
      // setError('Could not fetch location. Please enter manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveManualLocation = async () => {
    if (!address || !city) {
      setError('Please fill in both address and city');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await api.updateLocation({
        address,
        city,
        latitude: 0, // Manual entry fallback
        longitude: 0
      });
      setSuccess('Location updated successfully!');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err) {
      setError('Failed to update location');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12 }}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>Location Settings</Text>
      </View>

      <View style={{ padding: 24, gap: 20 }}>
        {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
        {success ? <Text style={{ color: 'green' }}>{success}</Text> : null}

        <TouchableOpacity 
          onPress={fetchCurrentLocation}
          disabled={isLoading}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}
        >
          {isLoading ? <ActivityIndicator color={COLORS.primary} /> : <MapPin size={20} color={COLORS.primary} />}
          <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 16 }}>Use Current Location</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
          <Text style={{ marginHorizontal: 16, color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase' }}>Or enter manually</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
        </View>

        <TextInput
          placeholder="Street Address"
          value={address}
          onChangeText={setAddress}
          style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16 }}
        />
        
        <TextInput
          placeholder="City"
          value={city}
          onChangeText={setCity}
          style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16 }}
        />

        <TouchableOpacity 
          onPress={saveManualLocation}
          disabled={isLoading}
          style={{ backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
