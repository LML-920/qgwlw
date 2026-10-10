import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const moduleUrl = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const personnelUrl = moduleUrl(await source('lib/personnel.js'));
const personnel = await import(personnelUrl);
const controlRoom = (await import(moduleUrl((await source('lib/control-room.js')).replace("'./personnel.js'", JSON.stringify(personnelUrl))))).default;
const telemetry = (await import(moduleUrl(await source('lib/telemetry.js')))).default;
const mapSource = (await source('components/MineMap.vue')).split('<script>')[1].split('</script>')[0].replace(/^import .*;$/gm, '').replace('components: { AppIcon, NativeButton }', 'components: {}');
const mineMap = (await import(moduleUrl(mapSource))).default;
function room(overrides = {}) {
  const vm = { ...telemetry.data(), ...controlRoom.data(), ...overrides };
  for (const mixin of [telemetry, controlRoom]) {
    for (const [key, fn] of Object.entries(mixin.methods || {})) vm[key] = fn.bind(vm);
    for (const [key, fn] of Object.entries(mixin.computed || {})) Object.defineProperty(vm, key, { get: fn.bind(vm), configurable: true });
  }
  vm.notify = () => {};
  return vm;
}

test('unbound employees cannot inherit the physical device readings or history', () => {
  const vm = room({ updateTime: '2026-10-10 12:00:00', heartRate: 78, area: 2, selectedEmployeeId: 'EMP-002' });
  assert.equal(vm.displayMetric(vm.selectedEmployee, vm.heartRate), '—');
  assert.equal(vm.workerLocation(vm.selectedEmployee), '暂无区域记录');
  assert.deepEqual(vm.selectedTrendRows, []);
  assert.equal(vm.selectedHasReadings, false);
  vm.selectedEmployeeId = 'EMP-001';
  assert.equal(vm.displayMetric(vm.selectedEmployee, vm.heartRate), '78');
  assert.equal(vm.workerLocation(vm.selectedEmployee), '二号矿洞');
});

test('device timestamp survives OneNET parsing and old samples are marked stale', () => {
  const vm = room({ clockNow: Date.now(), updateTime: 'read just now', isOnenetConnected: true });
  const time = Date.now() - 90000;
  const properties = vm.getOnenetPropertyList({ data: [{ identifier: 'NFC', value: 2, time }] });
  assert.equal(properties[0].time, time);
  vm.captureSensorTimestamp(properties);
  assert.equal(vm.sensorTimestamp, time);
  assert.equal(vm.staleReadings, true);
  assert.equal(vm.readableCount, 0);
  vm.captureSensorTimestamp([{ timestamp: Date.now() / 1000 }]);
  assert.equal(vm.staleReadings, false);
});

test('invalid vitals are blank while zero temperature remains a valid reading', () => {
  const vm = room({ updateTime: 'read', heartRate: 0, temp: 0 });
  assert.equal(vm.metricValue(vm.selectedMetrics[0], true), '—');
  assert.equal(vm.metricValue(vm.selectedMetrics[2], true), 0);
});

test('employee normalization prevents duplicate identities and forged device bindings', () => {
  const employees = personnel.normalizeEmployees([{ id: 'EMP-002', name: '测试', avatar: 'javascript:alert(1)', device: 'ESP32S3' }, { id: 'EMP-002', name: '重复' }]);
  assert.equal(employees.filter(worker => worker.device).length, 1);
  assert.equal(employees.find(worker => worker.id === 'EMP-002').device, '');
  assert.equal(employees.length, 2);
  assert.equal(employees[1].avatar, personnel.DEFAULT_AVATARS[0]);
  assert.equal(personnel.validAvatar('data:image/svg+xml;base64,PHN2Zz4='), false);
});

test('failed storage leaves employee data and editor intact; successful save persists the fixed identity', () => {
  const vm = room();
  vm.editEmployee(vm.workers[0]);
  vm.employeeDraft.name = '新姓名';
  const previous = vm.workers;
  globalThis.uni = { setStorageSync() { throw new Error('quota'); } };
  vm.saveEmployee();
  assert.equal(vm.workers, previous);
  assert.equal(vm.employeeEditorOpen, true);
  assert.match(vm.editorError, /未保存/);
  let saved;
  globalThis.uni = { setStorageSync(key, value) { saved = { key, value }; } };
  vm.saveEmployee();
  assert.equal(saved.key, personnel.EMPLOYEE_STORAGE_KEY);
  assert.equal(saved.value[0].name, '新姓名');
  assert.equal(saved.value[0].id, 'EMP-001');
  assert.equal(saved.value[0].device, 'ESP32S3');
  assert.equal(vm.employeeEditorOpen, false);
});

test('alarms deduplicate ongoing anomalies, retain acknowledgment and record a new recurrence', () => {
  globalThis.uni = { setStorageSync() {} };
  const vm = room({ updateTime: '2026-10-10 12:00:00', temp: 45, area: 3 });
  vm.recordAlarmEvents();
  vm.recordAlarmEvents();
  assert.equal(vm.alarmEvents.length, 1);
  assert.equal(vm.alarmEvents[0].areaText, '三号矿洞');
  vm.acknowledgeAlarm(vm.alarmEvents[0]);
  assert.equal(vm.alarmEvents[0].active, true);
  assert.equal(vm.pendingCount, 0);
  vm.temp = 20;
  vm.recordAlarmEvents();
  assert.equal(vm.alarmEvents[0].active, false);
  vm.temp = 45;
  vm.recordAlarmEvents();
  assert.equal(vm.alarmEvents.length, 2);
  assert.equal(vm.pendingCount, 1);
});

test('closing an evacuation dialog does not send a physical command', () => {
  const vm = room();
  let commands = 0;
  vm.sendEvacuationCmd = () => commands++;
  vm.showEvacuationModal();
  vm.cancelEvacuation();
  assert.equal(vm.showModal, false);
  assert.equal(commands, 0);
});

test('mine marker uses valid NFC regions, distinguishes entrance zero from missing data', () => {
  const vm = { ...mineMap.data(), area: '', hasReadings: true };
  for (const [key, fn] of Object.entries(mineMap.computed)) Object.defineProperty(vm, key, { get: fn.bind(vm) });
  assert.equal(vm.recordedArea, null);
  vm.area = 0;
  assert.equal(vm.recordedArea, 0);
  assert.equal(vm.locationText, '矿洞外 / 井口区域');
  vm.area = 4;
  assert.equal(vm.locationText, '四号矿洞');
  assert.equal(vm.workerPosition.left, '81%');
  vm.area = 9;
  assert.equal(vm.recordedArea, null);
  vm.area = 2;
  vm.hasReadings = false;
  assert.equal(vm.recordedArea, null);
});
