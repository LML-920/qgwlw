export const EMPLOYEE_STORAGE_KEY = 'mine-safe-employees-v1';
export const DEFAULT_AVATARS = [1, 2, 3, 4].map(id => `/static/workers/worker_${id}.png`);
export const DEFAULT_EMPLOYEES = [
  { id: 'EMP-001', name: '张建国', role: '采掘作业员', team: '采掘一班', avatar: DEFAULT_AVATARS[0], device: 'ESP32S3' },
  { id: 'EMP-002', name: '李志强', role: '安全巡检员', team: '安全巡检班', avatar: DEFAULT_AVATARS[1], device: '' },
  { id: 'EMP-003', name: '王海涛', role: '设备维护员', team: '设备保障班', avatar: DEFAULT_AVATARS[2], device: '' },
  { id: 'EMP-004', name: '陈志远', role: '采掘作业员', team: '采掘一班', avatar: DEFAULT_AVATARS[3], device: '' }
];

export function validAvatar(value) {
  return typeof value === 'string' && (DEFAULT_AVATARS.includes(value) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) && value.length < 500000;
}

export function normalizeEmployees(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return DEFAULT_EMPLOYEES.map(item => ({ ...item }));
  const seen = new Set();
  const employees = value.filter(item => item && /^EMP-\d{3,6}$/.test(item.id) && !seen.has(item.id) && seen.add(item.id)).map(item => ({
    id: item.id,
    name: String(item.name || '未命名员工').trim().slice(0, 16),
    role: String(item.role || '作业人员').trim().slice(0, 24),
    team: String(item.team || '未分配班组').trim().slice(0, 24),
    avatar: validAvatar(item.avatar) ? item.avatar : DEFAULT_AVATARS[0],
    // This first UI release has one physical device, bound to employee 01.
    device: item.id === 'EMP-001' ? 'ESP32S3' : ''
  }));
  if (!employees.some(item => item.id === 'EMP-001')) employees.unshift({ ...DEFAULT_EMPLOYEES[0] });
  return employees;
}

export function nextEmployeeId(employees) {
  const largest = Math.max(0, ...employees.map(item => Number(item.id.split('-')[1]) || 0));
  return `EMP-${String(largest + 1).padStart(3, '0')}`;
}
