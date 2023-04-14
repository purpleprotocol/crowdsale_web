export function hex2a(hexx) {
  let hex = hexx.toString(), str = '';
  for (let i = 0, l = hex.length; i < l; i += 2) { str += String.fromCharCode(parseInt(hex.substr(i, 2), 16)) }

  return str;
}

export function hex2int(hex) {
  return parseInt(hex.substring(2), 16);
}
