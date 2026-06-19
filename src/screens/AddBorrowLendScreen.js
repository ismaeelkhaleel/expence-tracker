import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { typography } from '../theme';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export default function AddBorrowLendScreen({ navigation, route }) {
  const { type } = route.params; // 'lend' or 'borrow'
  const isLend = type === 'lend';
  
  const { theme, addLendRecord, editLendRecord, addBorrowRecord, editBorrowRecord } = useAppContext();
  
  const existingRecord = route.params.record || null;
  const isEdit = !!existingRecord;

  const [personName, setPersonName] = useState(existingRecord ? existingRecord.personName : '');
  const [amount, setAmount] = useState(existingRecord ? existingRecord.amount.toString() : '');
  const [date, setDate] = useState(existingRecord ? new Date(existingRecord.date) : new Date());
  const [note, setNote] = useState(existingRecord ? existingRecord.note : '');

  const adjustDate = (days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    if (newDate > today) {
      Alert.alert('Invalid Date', 'You cannot add records for future dates.');
      return;
    }

    if (!isEdit && newDate < startOfCurrentMonth) {
      Alert.alert('Invalid Date', 'You can only add records for the current month.');
      return;
    }

    setDate(newDate);
  };

  const handleSave = async () => {
    if (!personName.trim()) {
      Alert.alert('Error', 'Please enter a person name');
      return;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const record = {
      id: isEdit ? existingRecord.id : Date.now().toString(),
      personName,
      amount: parseFloat(amount),
      date: date.toISOString(),
      note,
    };

    if (isLend) {
      if (isEdit) await editLendRecord(record.id, record);
      else await addLendRecord(record);
    } else {
      if (isEdit) await editBorrowRecord(record.id, record);
      else await addBorrowRecord(record);
    }

    navigation.goBack();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 8 }]}>Person Name *</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={personName}
          onChangeText={setPersonName}
          placeholder="e.g. John Doe"
          placeholderTextColor={theme.textSecondary}
        />

        <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 16, marginBottom: 8 }]}>Amount *</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
        />

        <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 16, marginBottom: 8 }]}>Date</Text>
        <View style={[styles.datePicker, { borderColor: theme.border }]}>
          <TouchableOpacity onPress={() => adjustDate(-1)} style={styles.dateBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.body, { color: theme.text }]}>{format(date, 'MMM dd, yyyy')}</Text>
          <TouchableOpacity onPress={() => adjustDate(1)} style={styles.dateBtn}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 16, marginBottom: 8 }]}>Note (Optional)</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, height: 80, textAlignVertical: 'top' }]}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="What was this for?"
          placeholderTextColor={theme.textSecondary}
        />

        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>{isEdit ? 'Update' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateBtn: {
    padding: 8,
  },
  saveBtn: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
