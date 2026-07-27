import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, getDaysInMonth, isSameMonth } from 'date-fns';
import { useAppContext } from '../context/AppContext';
import { calculateTotals, calculateBudgetInfo, getMonthKey } from '../utils/calculations';
import { formatCurrency } from '../utils/format';
import { getDateTransactions, getLatestTransactions } from '../storage/database';
import { typography } from '../theme';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';

export default function HomeScreen({ navigation }) {
  const { theme, budgets, settings, refreshTrigger } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayTransactions, setDayTransactions] = useState([]);
  const [latestTransactions, setLatestTransactions] = useState([]);
  const [dateModalVisible, setDateModalVisible] = useState(false);

  const fetchMonthData = useCallback(async () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const [dayData, latestData] = await Promise.all([
      getDateTransactions(dateKey),
      getLatestTransactions(5),
    ]);
    setDayTransactions(dayData);
    setLatestTransactions(latestData);
  }, [selectedDate]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData, refreshTrigger]);

  const { totalExpense, totalIncome, netExpense } = useMemo(() => 
    calculateTotals(dayTransactions), 
  [dayTransactions]);

  const monthKey = getMonthKey(selectedDate);
  const budgetLimit = budgets[monthKey] || 0;

  const budgetInfo = useMemo(() => 
    calculateBudgetInfo(budgetLimit, netExpense, selectedDate), 
  [budgetLimit, netExpense, selectedDate]);

  const getStatusColor = () => {
    if (budgetInfo.isExceeded) return theme.danger;
    if (budgetInfo.usagePercentage >= 80) return theme.warning;
    return theme.success;
  };

  const selectableDays = useMemo(() => {
    const today = new Date();
    const daysInMonth = getDaysInMonth(selectedDate);
    const lastDay = isSameMonth(selectedDate, today) ? today.getDate() : daysInMonth;

    return Array.from({ length: lastDay }, (_, index) => {
      const day = index + 1;
      return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    }).reverse();
  }, [selectedDate]);

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setDateModalVisible(false);
  };

  const renderTransactionRow = (item) => {
    const isExpense = item.type === 'expense';
    const amountColor = isExpense ? theme.danger : theme.success;

    return (
      <View key={item.id} style={[styles.latestItem, { borderBottomColor: theme.border }]}>
        <View style={styles.latestIcon}>
          <Ionicons name={isExpense ? 'arrow-up-circle' : 'arrow-down-circle'} size={20} color={amountColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
            {item.note || item.category || 'Untitled'}
          </Text>
          <Text style={[typography.small, { color: theme.textSecondary, marginTop: 2 }]}>
            {format(new Date(item.date), 'dd MMM yyyy')} · {item.category}
          </Text>
        </View>
        <Text style={[typography.body, { color: amountColor, fontWeight: 'bold' }]}>
          {isExpense ? '-' : '+'}{formatCurrency(item.amount, settings.currencySymbol)}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={styles.dateTitle} onPress={() => setDateModalVisible(true)}>
          <Ionicons name="calendar-outline" size={20} color={theme.primary} />
          <Text style={[typography.h3, { color: theme.text, marginLeft: 8 }]}>{format(selectedDate, 'do MMM')}</Text>
          <Ionicons name="chevron-down" size={18} color={theme.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card>
          <Text style={[typography.caption, { color: theme.textSecondary }]}>Net Expense</Text>
          <Text style={[typography.h1, { color: theme.text, marginVertical: 8 }]}>{formatCurrency(netExpense, settings.currencySymbol)}</Text>
          
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <View style={styles.rowCenter}>
                <Ionicons name="arrow-up-circle" size={16} color={theme.danger} style={{marginRight: 4}}/>
                <Text style={[typography.small, { color: theme.textSecondary }]}>Expense</Text>
              </View>
              <Text style={[typography.body, { color: theme.text, marginTop: 4 }]}>{formatCurrency(totalExpense, settings.currencySymbol)}</Text>
            </View>
            <View style={styles.halfCol}>
              <View style={styles.rowCenter}>
                <Ionicons name="arrow-down-circle" size={16} color={theme.success} style={{marginRight: 4}}/>
                <Text style={[typography.small, { color: theme.textSecondary }]}>Income</Text>
              </View>
              <Text style={[typography.body, { color: theme.text, marginTop: 4 }]}>{formatCurrency(totalIncome, settings.currencySymbol)}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.rowBetween}>
            <Text style={[typography.h3, { color: theme.text }]}>Budget</Text>
            <Text style={[typography.body, { color: theme.textSecondary }]}>{formatCurrency(budgetLimit, settings.currencySymbol)}</Text>
          </View>

          {budgetLimit > 0 ? (
            <View style={{ marginTop: 16 }}>
              <View style={[styles.rowBetween, { marginBottom: 8 }]}>
                <Text style={[typography.small, { color: theme.textSecondary }]}>Used: {formatCurrency(netExpense, settings.currencySymbol)}</Text>
                <Text style={[typography.small, { color: theme.textSecondary }]}>Left: {formatCurrency(Math.max(budgetInfo.remaining, 0), settings.currencySymbol)}</Text>
              </View>
              <ProgressBar progress={budgetInfo.usagePercentage} color={getStatusColor()} />
              
              <View style={{ marginTop: 16, backgroundColor: theme.background, padding: 12, borderRadius: 8 }}>
                <Text style={[typography.caption, { color: theme.text }]}>
                  Daily Average: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(budgetInfo.dailyAverage, settings.currencySymbol)}</Text> / day
                </Text>
                
                {budgetInfo.isExceeded ? (
                  <Text style={[typography.caption, { color: theme.danger, marginTop: 4, fontWeight: 'bold' }]}>
                    Budget exceeded by {formatCurrency(Math.abs(budgetInfo.remaining), settings.currencySymbol)}
                  </Text>
                ) : (
                  <Text style={[typography.caption, { color: theme.success, marginTop: 4 }]}>
                    You can safely spend <Text style={{ fontWeight: 'bold' }}>{formatCurrency(budgetInfo.recommendedDaily, settings.currencySymbol)}</Text> / day
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 12 }]}>No budget set for this month</Text>
              <TouchableOpacity 
                style={[styles.outlineBtn, { borderColor: theme.primary }]}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={{ color: theme.primary }}>Set Budget</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: theme.danger }]}
            onPress={() => navigation.navigate('AddTransaction', { type: 'expense' })}
          >
            <Ionicons name="remove-circle-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: theme.success }]}
            onPress={() => navigation.navigate('AddTransaction', { type: 'income' })}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Add Income</Text>
          </TouchableOpacity>
        </View>

        <Card>
          <View style={styles.rowBetween}>
            <Text style={[typography.h3, { color: theme.text }]}>Latest Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={[typography.caption, { color: theme.primary, fontWeight: 'bold' }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {latestTransactions.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              {latestTransactions.map(renderTransactionRow)}
            </View>
          ) : (
            <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 12 }]}>No transactions yet.</Text>
          )}
        </Card>

      </ScrollView>

      <Modal visible={dateModalVisible} transparent animationType="fade" onRequestClose={() => setDateModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDateModalVisible(false)}>
          <View style={[styles.dateModal, { backgroundColor: theme.surface }]}>
            <Text style={[typography.h3, { color: theme.text, marginBottom: 12 }]}>
              Select Date
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <View style={styles.dayGrid}>
                {selectableDays.map(day => {
                  const selected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  return (
                    <TouchableOpacity
                      key={day.toISOString()}
                      style={[
                        styles.dayChip,
                        { borderColor: theme.border, backgroundColor: selected ? theme.primary : theme.background }
                      ]}
                      onPress={() => handleSelectDate(day)}
                    >
                      <Text style={{ color: selected ? '#fff' : theme.text, fontWeight: selected ? 'bold' : '600' }}>
                        {format(day, 'do MMM')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dateTitle: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { paddingBottom: 24 },
  row: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 16 },
  halfCol: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outlineBtn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
  },
  actionBtn: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  latestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  latestIcon: {
    width: 32,
    alignItems: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  dateModal: {
    borderRadius: 12,
    padding: 16,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayChip: {
    width: '31%',
    margin: '1%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
});
