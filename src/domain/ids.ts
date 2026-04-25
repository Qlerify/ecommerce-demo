import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const newToken = customAlphabet(alphabet, 16);

export function newId(prefix: string): string {
  return `${prefix}_${newToken()}`;
}

export const ID = {
  cart: () => newId('cart'),
  lineItem: () => newId('cali'),
  shippingMethod: () => newId('casm'),
  creditLine: () => newId('cacl'),
  address: () => newId('addr'),
  taxLine: () => newId('tx'),
  adjustment: () => newId('adj'),
};
