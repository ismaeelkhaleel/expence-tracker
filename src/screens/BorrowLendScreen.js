import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/format';
import { typography } from '../theme';
import FAB from '../components/FAB';

const makeRecord = (personName, amount, type, note) => ({
  id: Date.now().toString(),
  personName,
  amount: parseFloat(amount),
  type,
  date: new Date().toISOString(),
  note,
});

export default function BorrowLendScreen({ navigation }) {
  const { theme, lendRecords, borrowRecords, addLendRecord, addBorrowRecord, settings } = useAppContext();
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [actionAmount, setActionAmount] = useState('');
  const [actionNote, setActionNote] = useState('');

  const allRecords = useMemo(
    () => [...lendRecords, ...borrowRecords].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [lendRecords, borrowRecords]
  );

  const people = useMemo(() => {
    const grouped = {};

    allRecords.forEach(record => {
      const key = record.personName.trim().toLowerCase();
      if (!grouped[key]) {
        grouped[key] = {
          personName: record.personName,
          balance: 0,
          records: [],
          lastDate: record.date,
        };
      }

      const signedAmount = record.type === 'lend' ? parseFloat(record.amount) : -parseFloat(record.amount);
      grouped[key].balance += signedAmount;
      grouped[key].records.push(record);

      if (new Date(record.date) > new Date(grouped[key].lastDate)) {
        grouped[key].lastDate = record.date;
      }
    });

    return Object.values(grouped).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
  }, [allRecords]);

  const totalToReceive = people.reduce((sum, person) => sum + Math.max(person.balance, 0), 0);
  const totalToPay = people.reduce((sum, person) => sum + Math.abs(Math.min(person.balance, 0)), 0);
  const netBalance = totalToReceive - totalToPay;

  const openActionModal = (person) => {
    setSelectedPerson(person);
    setActionAmount('');
    setActionNote('');
    setActionModalVisible(true);
  };

  const openHistoryModal = (person) => {
    setSelectedPerson(person);
    setHistoryModalVisible(true);
  };

  const closeActionModal = () => {
    setActionModalVisible(false);
    setSelectedPerson(null);
    setActionAmount('');
    setActionNote('');
  };

  const saveAction = async (action) => {
    if (!selectedPerson) return;

    if (action !== 'settle' && (!actionAmount || isNaN(actionAmount) || parseFloat(actionAmount) <= 0)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (action === 'settle') {
      if (selectedPerson.balance === 0) {
        closeActionModal();
        return;
      }

      const settleType = selectedPerson.balance > 0 ? 'borrow' : 'lend';
      const settleAmount = Math.abs(selectedPerson.balance);
      const record = makeRecord(selectedPerson.personName, settleAmount, settleType, 'Settled');
      if (settleType === 'lend') await addLendRecord(record);
      else await addBorrowRecord(record);
      closeActionModal();
      return;
    }

    const type = action === 'add' ? 'lend' : 'borrow';
    const note = actionNote.trim() || (action === 'add' ? 'Money added' : 'Money subtracted');
    const record = makeRecord(selectedPerson.personName, actionAmount, type, note);

    if (type === 'lend') await addLendRecord(record);
    else await addBorrowRecord(record);

    closeActionModal();
  };

  const renderItem = ({ item }) => {
    const isToReceive = item.balance >= 0;
    const amountColor = isToReceive ? theme.success : theme.danger;

    return (
      <TouchableOpacity
        style={[styles.recordItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
        onPress={() => openHistoryModal(item)}
      >
        <View style={styles.detailsContainer}>
          <Text style={[typography.body, { color: theme.text, fontWeight: 'bold' }]}>{item.personName}</Text>
          <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
            {isToReceive ? 'You will receive' : 'You owe'} · Updated {formatDate(item.lastDate)}
          </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[typography.body, { color: amountColor, fontWeight: 'bold' }]}>
            {formatCurrency(Math.abs(item.balance), settings.currencySymbol)}
          </Text>
          <TouchableOpacity onPress={() => openActionModal(item)} style={styles.editButton}>
            <Ionicons name="pencil" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const historyRecords = selectedPerson
    ? [...selectedPerson.records].sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[typography.caption, { color: theme.textSecondary }]}>To Receive</Text>
            <Text style={[typography.h3, { color: theme.success }]}>{formatCurrency(totalToReceive, settings.currencySymbol)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[typography.caption, { color: theme.textSecondary }]}>To Pay</Text>
            <Text style={[typography.h3, { color: theme.danger }]}>{formatCurrency(totalToPay, settings.currencySymbol)}</Text>
          </View>
        </View>
        <View style={[styles.netBalance, { borderTopColor: theme.border }]}>
          <Text style={[typography.body, { color: theme.text }]}>Net Balance:</Text>
          <Text style={[typography.h3, { color: netBalance >= 0 ? theme.success : theme.danger, marginLeft: 8 }]}>
            {netBalance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netBalance), settings.currencySymbol)}
          </Text>
        </View>
      </View>

      <View style={[styles.singleTab, { borderBottomColor: theme.border }]}>
        <Text style={[typography.body, { color: theme.primary, fontWeight: 'bold' }]}>People Balance</Text>
      </View>

      <FlatList
        data={people}
        keyExtractor={item => item.personName.toLowerCase()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.textSecondary} />
            <Text style={[typography.body, { color: theme.textSecondary, marginTop: 16 }]}>No records found.</Text>
          </View>
        }
      />

      <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={closeActionModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[typography.h3, { color: theme.text }]}>{selectedPerson?.personName}</Text>
            <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
              Current balance: {selectedPerson ? formatCurrency(Math.abs(selectedPerson.balance), settings.currencySymbol) : ''}
            </Text>

            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 16 }]}
              value={actionAmount}
              onChangeText={setActionAmount}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor={theme.textSecondary}
            />
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 12 }]}
              value={actionNote}
              onChangeText={setActionNote}
              placeholder="Note"
              placeholderTextColor={theme.textSecondary}
            />

            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.success }]} onPress={() => saveAction('add')}>
              <Text style={styles.modalButtonText}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.danger }]} onPress={() => saveAction('subtract')}>
              <Text style={styles.modalButtonText}>Subtract Money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={() => saveAction('settle')}>
              <Text style={styles.modalButtonText}>Settle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={closeActionModal}>
              <Text style={[typography.body, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={historyModalVisible} transparent animationType="slide" onRequestClose={() => setHistoryModalVisible(false)}>
        <View style={[styles.historySheet, { backgroundColor: theme.surface }]}>
          <View style={styles.historyHeader}>
            <Text style={[typography.h3, { color: theme.text }]}>{selectedPerson?.personName}</Text>
            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {historyRecords.map(record => {
              const isSettle = record.note === 'Settled';
              const isLend = record.type === 'lend';
              return isSettle ? (
                <View key={record.id} style={[styles.settleSeparator, { borderColor: theme.border }]}>
                  <Text style={[typography.caption, { color: theme.primary, fontWeight: 'bold' }]}>
                    Settled on {formatDate(record.date)}
                  </Text>
                </View>
              ) : (
                <View key={record.id} style={[styles.historyItem, { borderBottomColor: theme.border }]}>
                  <View>
                    <Text style={[typography.body, { color: theme.text, fontWeight: '600' }]}>
                      {record.note || (isLend ? 'Money added' : 'Money subtracted')}
                    </Text>
                    <Text style={[typography.small, { color: theme.textSecondary, marginTop: 4 }]}>{formatDate(record.date)}</Text>
                  </View>
                  <Text style={[typography.body, { color: isLend ? theme.success : theme.danger, fontWeight: 'bold' }]}>
                    {isLend ? '+' : '-'}{formatCurrency(record.amount, settings.currencySymbol)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <FAB icon="add" onPress={() => navigation.navigate('AddBorrowLend', { type: 'lend' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: {
    padding: 16,
    borderBottomWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  netBalance: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  singleTab: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  listContent: { paddingBottom: 80 },
  recordItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  editButton: {
    marginTop: 8,
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 12,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 4,
  },
  historySheet: {
    flex: 1,
    marginTop: 56,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settleSeparator: {
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
});
