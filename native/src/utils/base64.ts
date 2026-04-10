/**
 * Custom base64 decoder for React Native
 * Replaces the missing 'atob' in the RN environment.
 */
export const base64Decode = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';

  str = String(str).replace(/[\t\n\f\r ]+/g, '');
  if (str.length % 4 === 0) {
    str = str.replace(/==?$/, '');
  }
  if (str.length % 4 === 1 || /[^+/0-9A-Za-z]/.test(str)) {
    return '';
  }

  let bc = 0;
  let bs: any;
  let buffer: any;

  for (let i = 0, char; (char = str.charAt(i++)); ~char && ((bs = bc % 4 ? bs * 64 + char : char), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
    char = chars.indexOf(char);
  }

  return output;
};
