import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { api } from '../api';
import { useApp } from '../context/AppContext';

export const TrustedContactsScreen = ({ navigation }: { navigation: any }) => {
  const { triggerTouchActivity } = useApp();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelationship, setNewRelationship] = useState('');

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const data = await api.getTrustedContacts();
      setContacts(data || []);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Could not fetch trusted contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async () => {
    triggerTouchActivity();
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Validation', 'Name and Phone are required.');
      return;
    }
    
    try {
      await api.createTrustedContact({
        name: newName,
        phone: newPhone,
        relationship: newRelationship,
        preferred_channel: 'SMS',
        priority: contacts.length + 1
      });
      setNewName('');
      setNewPhone('');
      setNewRelationship('');
      fetchContacts();
      Alert.alert('Success', 'Trusted contact added.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add contact');
    }
  };

  const handleDeactivate = async (id: string) => {
    triggerTouchActivity();
    try {
      await api.updateTrustedContact(id, { is_active: false });
      fetchContacts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not deactivate contact');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginLeft: 16 }}>Trusted Contacts</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: COLORS.textSecondary, marginBottom: 20 }}>
          Add trusted friends or family. They will be notified automatically during a high-risk emergency escalation.
        </Text>

        <View style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Add New Contact</Text>
          
          <TextInput
            style={{ backgroundColor: COLORS.background, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}
            placeholder="Name"
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            style={{ backgroundColor: COLORS.background, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={newPhone}
            onChangeText={setNewPhone}
          />
          <TextInput
            style={{ backgroundColor: COLORS.background, padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border }}
            placeholder="Relationship (e.g., Sister)"
            value={newRelationship}
            onChangeText={setNewRelationship}
          />
          
          <TouchableOpacity 
            style={{ backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={handleAddContact}
          >
            <UserPlus size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '700' }}>Add Contact</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Your Contacts</Text>
        
        {loading ? (
          <Text style={{ color: COLORS.textSecondary }}>Loading...</Text>
        ) : contacts.filter(c => c.is_active).length === 0 ? (
          <Text style={{ color: COLORS.textSecondary, fontStyle: 'italic' }}>No active contacts.</Text>
        ) : (
          contacts.filter(c => c.is_active).map(contact => (
            <View key={contact.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <View>
                <Text style={{ fontWeight: '700', color: COLORS.text, fontSize: 16 }}>{contact.name}</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{contact.phone}</Text>
                {contact.relationship && <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>{contact.relationship}</Text>}
              </View>
              
              <TouchableOpacity onPress={() => handleDeactivate(contact.id)} style={{ padding: 8 }}>
                <Trash2 size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
