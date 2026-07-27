import * as SQLite from 'expo-sqlite';

let db = null;

export const initDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('expense.db');
    
    // Create tables
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT,
        amount REAL,
        category TEXT,
        date TEXT,
        note TEXT
      );
      CREATE TABLE IF NOT EXISTS borrow_lend (
        id TEXT PRIMARY KEY,
        type TEXT,
        personName TEXT,
        amount REAL,
        date TEXT,
        note TEXT
      );
      CREATE TABLE IF NOT EXISTS budgets (
        monthKey TEXT PRIMARY KEY,
        limitAmount REAL
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }
  return db;
};

// -- Settings --
export const getSettings = async () => {
  const statement = await db.prepareAsync('SELECT * FROM settings');
  const result = await statement.executeAsync();
  const rows = await result.getAllAsync();
  const settingsObj = {};
  rows.forEach(row => {
    try {
      settingsObj[row.key] = JSON.parse(row.value);
    } catch {
      settingsObj[row.key] = row.value;
    }
  });
  return settingsObj;
};

export const saveSetting = async (key, value) => {
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  const statement = await db.prepareAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  );
  await statement.executeAsync([key, valueStr]);
};

// -- Transactions --
export const getTransactionsPaginated = async (limit, offset, searchQuery, filterType, monthKey) => {
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];

  if (monthKey) {
    query += ' AND date LIKE ?';
    params.push(`${monthKey}%`);
  }

  if (searchQuery) {
    query += ' AND (note LIKE ? OR category LIKE ?)';
    params.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  if (filterType && filterType !== 'all') {
    query += ' AND type = ?';
    params.push(filterType);
  }

  query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const statement = await db.prepareAsync(query);
  const result = await statement.executeAsync(params);
  return await result.getAllAsync();
};

export const getLatestTransactions = async (limit = 5) => {
  const statement = await db.prepareAsync('SELECT * FROM transactions ORDER BY date DESC LIMIT ?');
  const result = await statement.executeAsync([limit]);
  return await result.getAllAsync();
};

export const getDateTransactions = async (dateKey) => {
  const statement = await db.prepareAsync('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC');
  const result = await statement.executeAsync([`${dateKey}%`]);
  return await result.getAllAsync();
};

export const getAllTransactionsForExport = async () => {
  const statement = await db.prepareAsync('SELECT * FROM transactions ORDER BY date DESC');
  const result = await statement.executeAsync();
  return await result.getAllAsync();
};

export const getMonthTransactions = async (monthKey) => {
  const statement = await db.prepareAsync('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC');
  const result = await statement.executeAsync([`${monthKey}%`]);
  return await result.getAllAsync();
};

export const getSixMonthsTrend = async () => {
  const query = `
    SELECT 
      substr(date, 1, 7) as month,
      type,
      SUM(amount) as total
    FROM transactions
    WHERE date >= date('now', 'start of month', '-5 months')
    GROUP BY month, type
    ORDER BY month ASC
  `;
  const statement = await db.prepareAsync(query);
  const result = await statement.executeAsync();
  return await result.getAllAsync();
};

export const insertTransaction = async (t) => {
  const statement = await db.prepareAsync(
    'INSERT INTO transactions (id, type, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)'
  );
  await statement.executeAsync([t.id, t.type, t.amount, t.category, t.date, t.note]);
};

export const updateTransaction = async (t) => {
  const statement = await db.prepareAsync(
    'UPDATE transactions SET type=?, amount=?, category=?, date=?, note=? WHERE id=?'
  );
  await statement.executeAsync([t.type, t.amount, t.category, t.date, t.note, t.id]);
};

export const deleteTransaction = async (id) => {
  const statement = await db.prepareAsync('DELETE FROM transactions WHERE id=?');
  await statement.executeAsync([id]);
};

// -- Borrow / Lend --
export const getBorrowLendRecords = async () => {
  const statement = await db.prepareAsync('SELECT * FROM borrow_lend ORDER BY date DESC');
  const result = await statement.executeAsync();
  return await result.getAllAsync();
};

export const insertBorrowLend = async (r) => {
  const statement = await db.prepareAsync(
    'INSERT INTO borrow_lend (id, type, personName, amount, date, note) VALUES (?, ?, ?, ?, ?, ?)'
  );
  await statement.executeAsync([r.id, r.type, r.personName, r.amount, r.date, r.note]);
};

export const updateBorrowLend = async (r) => {
  const statement = await db.prepareAsync(
    'UPDATE borrow_lend SET type=?, personName=?, amount=?, date=?, note=? WHERE id=?'
  );
  await statement.executeAsync([r.type, r.personName, r.amount, r.date, r.note, r.id]);
};

export const deleteBorrowLend = async (id) => {
  const statement = await db.prepareAsync('DELETE FROM borrow_lend WHERE id=?');
  await statement.executeAsync([id]);
};

// -- Budgets --
export const getBudgets = async () => {
  const statement = await db.prepareAsync('SELECT * FROM budgets');
  const result = await statement.executeAsync();
  const rows = await result.getAllAsync();
  const budgetsObj = {};
  rows.forEach(row => {
    budgetsObj[row.monthKey] = row.limitAmount;
  });
  return budgetsObj;
};

export const saveBudgetDB = async (monthKey, limitAmount) => {
  if (limitAmount > 0) {
    const statement = await db.prepareAsync('INSERT OR REPLACE INTO budgets (monthKey, limitAmount) VALUES (?, ?)');
    await statement.executeAsync([monthKey, limitAmount]);
  } else {
    const statement = await db.prepareAsync('DELETE FROM budgets WHERE monthKey=?');
    await statement.executeAsync([monthKey]);
  }
};

export const clearAllDataDB = async () => {
  await db.execAsync(`
    DELETE FROM transactions;
    DELETE FROM borrow_lend;
    DELETE FROM budgets;
    DELETE FROM settings;
  `);
};
