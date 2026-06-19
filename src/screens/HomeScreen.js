import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, subMonths, isAfter, startOfMonth } from 'date-fns';
import { useAppContext } from '../context/AppContext';
import { calculateTotals, calculateBudgetInfo, getMonthKey } from '../utils/calculations';
import { formatMonth, formatCurrency } from '../utils/format';
import { getMonthTransactions } from '../storage/database';
import { typography } from '../theme';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';

export default function HomeScreen({ navigation }) {
  const { theme, budgets, settings, refreshTrigger } = useAppContext();
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [monthTransactions, setMonthTransactions] = useState([]);

  const isCurrentMonth = getMonthKey(currentMonthDate) === getMonthKey(new Date());

  const handlePrevMonth = () => {
    // Only allow going back 2 months from current
    const currentRealMonth = startOfMonth(new Date());
    const minMonth = subMonths(currentRealMonth, 2);
    const newMonth = subMonths(currentMonthDate, 1);
    
    if (!isAfter(minMonth, newMonth)) {
      setCurrentMonthDate(newMonth);
    }
  };

  const handleNextMonth = () => {
    if (!isCurrentMonth) {
      setCurrentMonthDate(addMonths(currentMonthDate, 1));
    }
  };

  const fetchMonthData = useCallback(async () => {
    const data = await getMonthTransactions(getMonthKey(currentMonthDate));
    setMonthTransactions(data);
  }, [currentMonthDate]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData, refreshTrigger]);

  const { totalExpense, totalIncome, netExpense } = useMemo(() => 
    calculateTotals(monthTransactions), 
  [monthTransactions]);

  const monthKey = getMonthKey(currentMonthDate);
  const budgetLimit = budgets[monthKey] || 0;

  const budgetInfo = useMemo(() => 
    calculateBudgetInfo(budgetLimit, netExpense, currentMonthDate), 
  [budgetLimit, netExpense, currentMonthDate]);

  const getStatusColor = () => {
    if (budgetInfo.isExceeded) return theme.danger;
    if (budgetInfo.usagePercentage >= 80) return theme.warning;
    return theme.success;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: theme.text }]}>{formatMonth(currentMonthDate)}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }} disabled={isCurrentMonth}>
          <Ionicons name="chevron-forward" size={24} color={theme.text} />
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
                <Text style={[typography.small, { color: theme.textSecondary }]}>Left: {formatCurrency(Math.max(budgetInfo.remaining, 0))}</Text>
              </View>
              <ProgressBar progress={budgetInfo.usagePercentage} color={getStatusColor()} />
              
              <View style={{ marginTop: 16, backgroundColor: theme.background, padding: 12, borderRadius: 8 }}>
                <Text style={[typography.caption, { color: theme.text }]}>
                  Daily Average: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(budgetInfo.dailyAverage, settings.currencySymbol)}</Text> / day
                </Text>
                
                {budgetInfo.isExceeded ? (
                  <Text style={[typography.caption, { color: theme.danger, marginTop: 4, fontWeight: 'bold' }]}>
                    Budget exceeded by {formatCurrency(Math.abs(budgetInfo.remaining, settings.currencySymbol))}
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

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
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
  }
});
