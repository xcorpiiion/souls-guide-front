export function replaceAll(valor: string, replaceBy: string, regex: string): string {
  const reg = new RegExp(regex);
  if (!valor) return valor;
  const next = valor.replace(reg, replaceBy);
  return valor === next ? next : replaceAll(next, replaceBy, regex);
}

export function capitalizeFirstLetter(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function normalizeNFD(value: string): string {
  return value.normalize('NFD').replaceAll(/\W/g, '');
}

export function substringToMaxSize(str: string, maxSize: number): string {
  return str?.length > maxSize ? str.substring(0, maxSize) : str;
}

export function anonimizarEmail(email: string): string {
  if (!email?.includes('@')) return 'Email inválido';
  const [user, domain] = email.split('@');
  const maskedUser =
    user.length <= 3
      ? user[0] + '*'.repeat(user.length - 1)
      : user[0] + '*'.repeat(user.length - 2) + user.at(-1);
  const [domainName, ...ext] = domain.split('.');
  const maskedDomain = domainName[0] + '*'.repeat(domainName.length - 1);
  return `${maskedUser}@${maskedDomain}.${ext.join('.')}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
