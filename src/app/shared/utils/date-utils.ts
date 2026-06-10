const formatTemplates = {
  shortDate: 'dd/MM/yyyy',
  longDate: 'dd de MMMM de yyyy',
  shortTime: 'HH:mm',
  longTime: 'HH:mm:ss',
  shortDateTime: 'dd/MM/yyyy HH:mm',
  longDateTime: 'dd de MMMM de yyyy, HH:mm:ss',
  datePicker: 'yyyy-MM-dd',
} as const;

export type DateFormat = keyof typeof formatTemplates | (string & {});

const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const pad = (n: number) => n.toString().padStart(2, '0');

export function formatDate(date: Date, format: DateFormat): string {
  if (Number.isNaN(date.getTime())) return '';
  const template = format in formatTemplates ? formatTemplates[format as keyof typeof formatTemplates] : format;
  return template.replaceAll(/yyyy|MMMM|MM|dd|HH|mm|ss/g, (match) => {
    switch (match) {
      case 'yyyy': return date.getFullYear().toString();
      case 'MMMM': return MONTHS[date.getMonth()];
      case 'MM':   return pad(date.getMonth() + 1);
      case 'dd':   return pad(date.getDate());
      case 'HH':   return pad(date.getHours());
      case 'mm':   return pad(date.getMinutes());
      case 'ss':   return pad(date.getSeconds());
      default:     return match;
    }
  });
}

export function today(): Date {
  return new Date();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatRelative(date: Date): string {
  const hoje = new Date();
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dataSemHora = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (dataSemHora.getTime() - hojeSemHora.getTime()) / (1000 * 3600 * 24);
  if (diff === 0)  return 'hoje';
  if (diff === -1) return 'ontem';
  if (diff === 1)  return 'amanhã';
  return formatDate(date, 'shortDate');
}
