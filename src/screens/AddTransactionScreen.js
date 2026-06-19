import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { TRANSACTION_TYPES } from '../constants/categories';
import { typography } from '../theme';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export default function AddTransactionScreen({ navigation, route }) {
  const { type } = route.params; // 'expense' or 'income'
  const isExpense = type === TRANSACTION_TYPES.EXPENSE;
  
  const { theme, addTransaction, editTransaction, settings } = useAppContext();
  
  const existingTransaction = route.params.transaction || null;
  const isEdit = !!existingTransaction;

  const dynamicCategories = settings?.categories || [];

  const [amount, setAmount] = useState(existingTransaction ? existingTransaction.amount.toString() : '');
  const [category, setCategory] = useState(existingTransaction ? existingTransaction.category : (isExpense ? (dynamicCategories[0] || 'Misc') : 'Income'));
  const [date, setDate] = useState(existingTransaction ? new Date(existingTransaction.date) : new Date());
  const [note, setNote] = useState(existingTransaction ? existingTransaction.note : '');

  // For simplicity, we just adjust the day backwards or forwards if user wants to change date.
  const adjustDate = (days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    
    const today = new Date();
    // Reset time for accurate day comparison
    today.setHours(23, 59, 59, 999);
    
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    if (newDate > today) {
      Alert.alert('Invalid Date', 'You cannot add transactions for future dates.');
      return;
    }

    if (!isEdit && newDate < startOfCurrentMonth) {
      Alert.alert('Invalid Date', 'You can only add transactions for the current month.');
      return;
    }

    setDate(newDate);
  };

    const handleSave = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!note || !note.trim()) {
      Alert.alert('Error', 'Please enter a title (Where you spent)');
      return;
    }

    const transaction = {
      id: isEdit ? existingTransaction.id : Date.now().toString(),
      type: isExpense ? TRANSACTION_TYPES.EXPENSE : TRANSACTION_TYPES.INCOME,
      amount: parseFloat(amount),
      category: isExpense ? category : 'Income',
      date: date.toISOString(),
      note,
    };

    if (isEdit) {
      await editTransaction(transaction.id, transaction);
    } else {
      await addTransaction(transaction);
    }

    navigation.goBack();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 8 }]}>Amount *</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
        />

        {isExpense && (
          <>
            <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 16, marginBottom: 8 }]}>Category *</Text>
            <View style={styles.categoriesContainer}>
              {dynamicCategories.map(cat => (
                <TouchableOpacity 
                  key={cat}
                  style={[
                    styles.categoryChip, 
                    { 
                      backgroundColor: category === cat ? theme.primary : theme.background,
                      borderColor: category === cat ? theme.primary : theme.border
                    }
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={{ color: category === cat ? '#fff' : theme.text }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

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

        <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 16, marginBottom: 8 }]}>Title / Spent On *</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, height: 80, textAlignVertical: 'top' }]}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="e.g., McDonald's, Salary, Electricity Bill"
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
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
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
