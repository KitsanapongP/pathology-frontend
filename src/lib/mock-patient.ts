// Synthetic identities shared by request rows and OCR examples.
export function mockPatientName(index: number): string {
  const pair = Math.floor(index / 2);
  const women = ['สมหญิง', 'มาลี', 'วิภา', 'สุดา', 'อรทัย', 'นภา', 'กาญจนา', 'รัตนา', 'จินตนา', 'พิมพ์ใจ'];
  const men = ['สมชาย', 'วิชัย', 'ประเสริฐ', 'ธนา', 'สุรชัย', 'อนันต์', 'กิตติ', 'ณรงค์', 'ชัยวัฒน์', 'วิเชียร'];
  const surnames = ['ใจดี', 'สุขใจ', 'แสงทอง', 'มั่นคง', 'รุ่งเรือง', 'เจริญสุข', 'บุญมา', 'พรดี', 'ศรีสุข', 'งามจิต'];
  const female = index % 2 === 0;
  const prefix = female ? pair % 3 === 1 ? 'นางสาว' : 'นาง' : 'นาย';
  const name = (female ? women : men)[pair % 10];
  return `${prefix} ${name} ${surnames[(pair + Math.floor(pair / 10)) % 10]}`;
}
