import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { getTransactionsPaginated } from '../storage/database';
import { formatCurrency } from '../utils/format';
import { typography } from '../theme';
import { TRANSACTION_TYPES } from '../constants/categories';
import { format, subMonths } from 'date-fns';
import { getMonthKey } from '../utils/calculations';

const getCategoryIcon = (category) => {
  switch(category) {
    case 'Food': return 'fast-food';
    case 'Grocery': return 'cart';
    case 'Transport': return 'bus';
    case 'Mobile Recharge': return 'phone-portrait';
    case 'Shopping': return 'bag-handle';
    case 'Entertainment': return 'film';
    case 'Medical': return 'medkit';
    case 'Income': return 'wallet';
    default: return 'cash';
  }
};

const PAGE_SIZE = 20;

export default function TransactionsScreen({ navigation }) {
  const { theme, deleteTransaction, settings, refreshTrigger } = useAppContext();
  
  const [filterType, setFilterType] = useState('all'); // 'all', 'expense', 'income'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  
  const [transactions, setTransactions] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const currentOffset = reset ? 0 : offset;
      const newItems = await getTransactionsPaginated(PAGE_SIZE, currentOffset, searchQuery, filterType, getMonthKey(selectedMonth));
      
      if (reset) {
        setTransactions(newItems);
      } else {
        setTransactions(prev => [...prev, ...newItems]);
      }
      
      setOffset(currentOffset + PAGE_SIZE);
      setHasMore(newItems.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [offset, searchQuery, filterType, selectedMonth, loading]);

  // Initial load & refresh trigger
  useEffect(() => {
    fetchTransactions(true);
  }, [refreshTrigger, filterType, searchQuery, selectedMonth]);

  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 24 }, (_, index) => subMonths(now, index));
  }, []);

  const groupedTransactions = useMemo(() => {
    const groups = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const sortableKey = format(d, 'yyyy-MM-dd');
      
      if (!groups[sortableKey]) {
        groups[sortableKey] = {
          title: format(d, 'dd MMM yyyy'),
          data: []
        };
      }
      groups[sortableKey].data.push(t);
    });
    
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => ({
        title: groups[key].title,
        data: groups[key].data.sort((a, b) => new Date(b.date) - new Date(a.date))
      }));
  }, [transactions]);

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTransaction(id) }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isExpense = item.type === TRANSACTION_TYPES.EXPENSE;
    const amountColor = isExpense ? theme.danger : theme.success;
    const iconName = getCategoryIcon(item.category);

    return (
      <View style={[styles.transactionItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: amountColor + '15' }]}>
            <Ionicons name={iconName} size={22} color={amountColor} />
          </View>
        </View>
        
        <View style={styles.detailsContainer}>
          <Text style={[typography.body, { color: theme.text, fontWeight: 'bold' }]}>{item.note || 'Untitled'}</Text>
          <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>{item.category}</Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[typography.body, { color: amountColor, fontWeight: 'bold' }]}>
            {isExpense ? '-' : '+'}{formatCurrency(item.amount, settings.currencySymbol)}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => navigation.navigate('AddTransaction', { type: item.type, transaction: item })} style={styles.actionIcon}>
              <Ionicons name="pencil" size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionIcon}>
              <Ionicons name="trash" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by note or category..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.monthSelector, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setMonthModalVisible(true)}
      >
        <View style={styles.monthSelectorText}>
          <Ionicons name="calendar-outline" size={20} color={theme.primary} />
          <Text style={[typography.body, { color: theme.text, fontWeight: 'bold', marginLeft: 8 }]}>
            {format(selectedMonth, 'MMMM yyyy')}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity 
          style={[styles.tab, filterType === 'all' && { backgroundColor: theme.primary }]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.tabText, { color: filterType === 'all' ? '#fff' : theme.textSecondary }]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, filterType === TRANSACTION_TYPES.EXPENSE && { backgroundColor: theme.danger }]}
          onPress={() => setFilterType(TRANSACTION_TYPES.EXPENSE)}
        >
          <Text style={[styles.tabText, { color: filterType === TRANSACTION_TYPES.EXPENSE ? '#fff' : theme.textSecondary }]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, filterType === TRANSACTION_TYPES.INCOME && { backgroundColor: theme.success }]}
          onPress={() => setFilterType(TRANSACTION_TYPES.INCOME)}
        >
          <Text style={[styles.tabText, { color: filterType === TRANSACTION_TYPES.INCOME ? '#fff' : theme.textSecondary }]}>Income</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={groupedTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
            <Text style={[typography.caption, { color: theme.textSecondary, fontWeight: 'bold' }]}>{title}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[typography.body, { color: theme.textSecondary, marginTop: 16 }]}>
                {searchQuery ? 'No transactions found.' : 'No transactions for this month.'}
              </Text>
            </View>
          )
        }
        onEndReached={() => {
          if (hasMore && !loading) fetchTransactions(false);
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />

      <Modal visible={monthModalVisible} transparent animationType="fade" onRequestClose={() => setMonthModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMonthModalVisible(false)}>
          <View style={[styles.monthModal, { backgroundColor: theme.surface }]}>
            <Text style={[typography.h3, { color: theme.text, marginBottom: 12 }]}>Select Month</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {monthOptions.map(month => {
                const selected = getMonthKey(month) === getMonthKey(selectedMonth);
                return (
                  <TouchableOpacity
                    key={month.toISOString()}
                    style={[styles.monthOption, { backgroundColor: selected ? theme.primary : 'transparent' }]}
                    onPress={() => {
                      setSelectedMonth(month);
                      setMonthModalVisible(false);
                    }}
                  >
                    <Text style={[typography.body, { color: selected ? '#fff' : theme.text, fontWeight: selected ? 'bold' : 'normal' }]}>
                      {format(month, 'MMMM yyyy')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  monthSelector: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthSelectorText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#00000010',
  },
  tabText: {
    fontWeight: 'bold',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    marginRight: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionIcon: {
    marginLeft: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  monthModal: {
    borderRadius: 12,
    padding: 16,
  },
  monthOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
