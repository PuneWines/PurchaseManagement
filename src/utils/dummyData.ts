import { IndentItem } from '../types';
import { storageUtils } from './storage';

const VENDORS = ['ABC Corp', 'XYZ Ltd', 'Global Supplies', 'Metro Distributors', 'Prime Vendors'];
const SHOPS = ['Downtown Store', 'Mall Branch', 'Airport Outlet', 'City Center', 'Suburban Branch'];
const ITEMS = ['Beverages', 'Snacks', 'Water Bottles', 'Energy Drinks', 'Soft Drinks'];
const TRANSPORTERS = ['Fast Logistics', 'Speed Transport', 'Quick Delivery', 'Express Cargo', 'Rapid Transit'];
const SIZES = ['2L', '1L', 'QRT', '700ml', '375ml', '200ml', '180ml', '90ml', '60ml', '50ml', '650ml', '500ml', '330ml', '275ml'];

export const initializeDummyData = () => {
  const existingIndents = storageUtils.getIndents();
  if (existingIndents.length === 0) {
    const dummyIndents: IndentItem[] = [];
    
    for (let i = 1; i <= 15; i++) {
      const status = i <= 3 ? 'pending' : 
                   i <= 6 ? 'approved' : 
                   i <= 9 ? 'po_generated' :
                   i <= 12 ? 'lifting' : 'received';
                   
      const indent: IndentItem = {
        id: `indent-${i}`,
        indentNumber: `IND2025${i.toString().padStart(4, '0')}`,
        serialNumber: i,
        orderDate: new Date(2025, 0, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
        vendorName: VENDORS[Math.floor(Math.random() * VENDORS.length)],
        shopName: SHOPS[Math.floor(Math.random() * SHOPS.length)],
        orderPreparedBy: Math.random() > 0.5 ? 'John Doe' : 'Jane Smith',
        orderSubmittedBy: Math.random() > 0.5 ? 'Admin User' : 'Manager',
        itemName: ITEMS[Math.floor(Math.random() * ITEMS.length)],
        sizes: SIZES.slice(0, Math.floor(Math.random() * 5) + 1),
        remarks: `Sample remarks for order ${i}`,
        status,
        createdAt: new Date().toISOString(),
      };

      if (status !== 'pending') {
        indent.approvalStatus = Math.random() > 0.2 ? 'approved' : 'rejected';
      }

      if (status === 'po_generated' || status === 'lifting' || status === 'received') {
        indent.transporterName = TRANSPORTERS[Math.floor(Math.random() * TRANSPORTERS.length)];
      }

      if (status === 'lifting' || status === 'received') {
        indent.transportCopy = `TC${i.toString().padStart(3, '0')}`;
        indent.qty = `${Math.floor(Math.random() * 100) + 10}`;
        indent.billCopy = `BC${i.toString().padStart(3, '0')}`;
        indent.driverName = `Driver ${i}`;
        indent.driverWhatsapp = `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`;
        indent.vehicleNo = `MH${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10000)}`;
      }

      if (status === 'received') {
        indent.receiveStatus = Math.random() > 0.3 ? 'All Okay' : 'Not Okay';
        indent.receivedQty = `${Math.floor(Math.random() * 95) + 5}`;
        indent.receiveRemarks = `Received remarks for order ${i}`;
      }

      dummyIndents.push(indent);
    }

    storageUtils.saveIndents(dummyIndents);
  }
};