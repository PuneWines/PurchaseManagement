import { IndentItem, User } from '../types';

const STORAGE_KEYS = {
  USER: 'purchase_app_user',
  INDENTS: 'purchase_app_indents',
  CURRENT_PAGE: 'purchase_app_current_page',
};

export const storageUtils = {
  // User management
  getCurrentUser: (): User | null => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },

  setCurrentUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  clearCurrentUser: (): void => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  // Indent management
  getIndents: (): IndentItem[] => {
    const indents = localStorage.getItem(STORAGE_KEYS.INDENTS);
    const parsed = indents ? JSON.parse(indents) : [];
    console.log('Loaded indents from localStorage:', parsed.length, 'items');
    return parsed;
  },

  saveIndents: (indents: IndentItem[]): void => {
    localStorage.setItem(STORAGE_KEYS.INDENTS, JSON.stringify(indents));
  },

  addIndent: (indent: IndentItem): void => {
    const indents = storageUtils.getIndents();
    indents.push(indent);
    storageUtils.saveIndents(indents);
  },

  updateIndent: (indentId: string, updates: Partial<IndentItem>): void => {
    const indents = storageUtils.getIndents();
    const index = indents.findIndex(indent => indent.id === indentId);
    if (index !== -1) {
      indents[index] = { ...indents[index], ...updates };
      storageUtils.saveIndents(indents);
      console.log('Indent updated and saved:', indents[index]);
    } else {
      console.error('Indent not found for update:', indentId);
    }
  },

  generateIndentNumber: (): string => {
    const indents = storageUtils.getIndents();
    const year = new Date().getFullYear();
    const count = indents.length + 1;
    return `IND${year}${count.toString().padStart(4, '0')}`;
  },

  getNextSerialNumber: (): number => {
    const lastNumber = localStorage.getItem('last_serial_number');
    return lastNumber ? parseInt(lastNumber, 10) + 1 : 1;
  },

  // Current page management
  getCurrentPage: (): string => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_PAGE) || 'dashboard';
  },

  setCurrentPage: (page: string): void => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PAGE, page);
  },

  clearCurrentPage: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PAGE);
  },
};