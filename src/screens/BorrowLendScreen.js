import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/format';
import { typography } from '../theme';
import FAB from '../components/FAB';

export default function BorrowLendScreen({ navigation }) {
  const { theme, lendRecords, borrowRecords, deleteLendRecord, deleteBorrowRecord, settings } = useAppContext();
  const [activeTab, setActiveTab] = useState('lend'); // 'lend' = Money I Gave, 'borrow' = Money I Owe

  const totalToReceive = lendRecords.reduce((sum, record) => sum + parseFloat(record.amount), 0);
  const totalToPay = borrowRecords.reduce((sum, record) => sum + parseFloat(record.amount), 0);
  const netBalance = totalToReceive - totalToPay;

  const handleDelete = (id, type) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this record?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
          if (type === 'lend') deleteLendRecord(id);
          else deleteBorrowRecord(id);
        }}
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isLend = activeTab === 'lend';
    const amountColor = isLend ? theme.success : theme.danger;
    
    return (
      <View style={[styles.recordItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.detailsContainer}>
          <Text style={[typography.body, { color: theme.text, fontWeight: 'bold' }]}>{item.personName}</Text>
          <Text style={[typography.caption, { color: theme.textSecondary }]}>{formatDate(item.date)}</Text>
          {item.note ? <Text style={[typography.small, { color: theme.textSecondary }]} numberOfLines={1}>{item.note}</Text> : null}
        </View>
        <View style={styles.amountContainer}>
          <Text style={[typography.body, { color: amountColor, fontWeight: 'bold' }]}>
            {formatCurrency(item.amount, settings.currencySymbol)}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => navigation.navigate('AddBorrowLend', { type: activeTab, record: item })} style={{ marginRight: 12 }}>
              <Ionicons name="pencil" size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id, activeTab)}>
              <Ionicons name="trash" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

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
            {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, settings.currencySymbol)}
          </Text>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'lend' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('lend')}
        >
          <Text style={[typography.body, { color: activeTab === 'lend' ? theme.primary : theme.textSecondary, fontWeight: activeTab === 'lend' ? 'bold' : 'normal' }]}>
            Money I Gave
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'borrow' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('borrow')}
        >
          <Text style={[typography.body, { color: activeTab === 'borrow' ? theme.primary : theme.textSecondary, fontWeight: activeTab === 'borrow' ? 'bold' : 'normal' }]}>
            Money I Owe
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={(activeTab === 'lend' ? lendRecords : borrowRecords).sort((a, b) => new Date(b.date) - new Date(a.date))}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.textSecondary} />
            <Text style={[typography.body, { color: theme.textSecondary, marginTop: 16 }]}>
              No records found.
            </Text>
          </View>
        }
      />

      <FAB 
        icon="add" 
        onPress={() => navigation.navigate('AddBorrowLend', { type: activeTab })} 
      />
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
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
  actions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  }
});
