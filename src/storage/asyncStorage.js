import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TRANSACTIONS: '@transactions',
  BUDGETS: '@budgets',
  LEND_RECORDS: '@lend_records',
  BORROW_RECORDS: '@borrow_records',
  SETTINGS: '@settings',
};

const defaultSettings = {
  isDarkMode: false,
};

export const loadData = async () => {
  try {
    const [transactions, budgets, lendRecords, borrowRecords, settings] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
      AsyncStorage.getItem(STORAGE_KEYS.BUDGETS),
      AsyncStorage.getItem(STORAGE_KEYS.LEND_RECORDS),
      AsyncStorage.getItem(STORAGE_KEYS.BORROW_RECORDS),
      AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
    ]);

    return {
      transactions: transactions ? JSON.parse(transactions) : [],
      budgets: budgets ? JSON.parse(budgets) : {},
      lendRecords: lendRecords ? JSON.parse(lendRecords) : [],
      borrowRecords: borrowRecords ? JSON.parse(borrowRecords) : [],
      settings: settings ? JSON.parse(settings) : defaultSettings,
    };
  } catch (error) {
    console.error('Error loading data from AsyncStorage', error);
    return {
      transactions: [],
      budgets: {},
      lendRecords: [],
      borrowRecords: [],
      settings: defaultSettings,
    };
  }
};

export const saveData = async (key, data) => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEYS[key], jsonValue);
  } catch (error) {
    console.error(`Error saving ${key} to AsyncStorage`, error);
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error('Error clearing AsyncStorage', error);
  }
};

export const exportData = async () => {
  return await loadData();
};

export const importData = async (data) => {
  try {
    if (data.transactions) await saveData('TRANSACTIONS', data.transactions);
    if (data.budgets) await saveData('BUDGETS', data.budgets);
    if (data.lendRecords) await saveData('LEND_RECORDS', data.lendRecords);
    if (data.borrowRecords) await saveData('BORROW_RECORDS', data.borrowRecords);
    if (data.settings) await saveData('SETTINGS', data.settings);
  } catch (error) {
    console.error('Error importing data', error);
    throw error;
  }
};
