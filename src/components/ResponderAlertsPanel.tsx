import React from 'react';
import { RefreshCw } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  alerts: any[];
  color: string;
  onRefresh: () => void;
  onAlertPress?: (alert: any) => void;
};

export const ResponderAlertsPanel = ({ alerts, color, onRefresh, onAlertPress }: Props) => (
  <View style={{ marginBottom: 20 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Alerts ({alerts.length})</Text>
      <TouchableOpacity onPress={onRefresh} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <RefreshCw size={14} color={color} />
        <Text style={{ color, fontWeight: '700' }}>Refresh</Text>
      </TouchableOpacity>
    </View>
    {alerts.length === 0 ? (
      <Text style={{ color: '#94A3B8', fontStyle: 'italic' }}>No persisted alerts for this responder.</Text>
    ) : alerts.map((alert: any) => (
      <TouchableOpacity key={alert.id} disabled={!alert.case_id || !onAlertPress} onPress={() => onAlertPress?.(alert)} style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ color: '#334155', fontWeight: '800' }}>{alert.recipient_type || 'Alert'} · {alert.channel || 'UNKNOWN'}</Text>
          <Text style={{ color: alert.status === 'FAILED' ? '#DC2626' : color, fontWeight: '800' }}>{alert.status || 'UNKNOWN'}</Text>
        </View>
        <Text style={{ color: '#64748B', marginTop: 5 }}>Case: {alert.case_id || 'Unlinked'} · Risk: {alert.risk_level || 'N/A'}</Text>
        <Text style={{ color: '#64748B', marginTop: 3 }}>Medical required: {alert.medical_required ? 'Yes' : 'No'} · {alert.delivery_mode || 'UNKNOWN'}</Text>
        <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 5 }}>Created: {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'N/A'}</Text>
        {alert.sent_at ? <Text style={{ color: '#94A3B8', fontSize: 12 }}>Sent: {new Date(alert.sent_at).toLocaleString()}</Text> : null}
        {alert.failure_reason ? <Text style={{ color: '#B91C1C', fontSize: 12, marginTop: 4 }}>Failure: {alert.failure_reason}</Text> : null}
        {alert.support_service?.name ? <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Service: {alert.support_service.name}</Text> : null}
      </TouchableOpacity>
    ))}
  </View>
);