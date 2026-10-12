import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const moduleUrl = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const personnelUrl = moduleUrl(await source('lib/personnel.js'));
const personnel = await import(personnelUrl);
const controlRoom = (await import(moduleUrl((await source('lib/control-room.js')).replace("'./personnel.js'", JSON.stringify(personnelUrl))))).default;
const telemetry = (await import(moduleUrl(await source('lib/telemetry.js')))).default;
const personnelSync = (await import(moduleUrl((await source('lib/personnel-sync.js')).replace("'./personnel.js'", JSON.stringify(personnelUrl))))).default;
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
test('map falls back to JPEG, retains preview and permits an explicit retry',()=>{
  const vm=mineMap.data();
  mineMap.methods.recoverImage.call(vm);
  assert.equal(vm.imageSource,'/static/mine-map-v3.jpg');
  assert.equal(vm.imageFailed,false);
  mineMap.methods.recoverImage.call(vm);
  assert.equal(vm.imageFailed,true);
  mineMap.methods.retryImage.call(vm);
  assert.equal(vm.imageFailed,false);
  assert.match(vm.imageSource,/mine-map-v3.webp\?retry=/);
});
test('AI portrait library includes four different new mining helmets',()=>{
  assert.equal(personnel.DEFAULT_AVATARS.length,8);
  for(const avatar of personnel.DEFAULT_AVATARS.slice(4)) assert.equal(personnel.validAvatar(avatar),true);
});
test('personnel requests load without a management password',async()=>{
  const original=globalThis.fetch;
  let request;
  globalThis.fetch=async(url,options)=>{request=options;return {ok:true,json:async()=>({revision:6})};};
  try {assert.equal((await personnelSync.methods.personnelRequest.call({},'')).revision,6);assert.equal(request.headers.Authorization,undefined);}
  finally {globalThis.fetch=original;}
});

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
  assert.equal(employees.find(worker => worker.id === 'EMP-002').device, 'ESP32S3');
  assert.equal(employees.length, 1);
  assert.equal(employees[0].avatar, personnel.DEFAULT_AVATARS[0]);
  assert.equal(personnel.validAvatar('data:image/svg+xml;base64,PHN2Zz4='), false);
});

test('failed cloud save preserves editor; successful save retains fixed identity', async () => {
  const vm=room();vm.editEmployee(vm.workers[0]);vm.employeeDraft.name='新姓名';
  const previous=vm.workers;vm.publishPersonnel=async()=>{throw Error('云端未保存');};
  await vm.saveEmployee();assert.equal(vm.workers,previous);assert.equal(vm.employeeEditorOpen,true);assert.match(vm.editorError,/未保存/);
  let saved;vm.publishPersonnel=async next=>{saved=next;vm.workers=next;};
  await vm.saveEmployee();assert.equal(saved[0].name,'新姓名');assert.equal(saved[0].id,'EMP-001');assert.equal(saved[0].device,'ESP32S3');assert.equal(vm.employeeEditorOpen,false);
});
test('all employees can be deleted without recreating default identities',()=>{
  assert.deepEqual(personnel.normalizeEmployees([]),[]);const vm=room({workers:[]});assert.equal(vm.boundEmployee.id,'');assert.equal(vm.selectedEmployee.id,'');assert.deepEqual(vm.overviewWorkers,[]);
});
test('binding transfers the physical source to the selected employee',async()=>{
  const vm=room();vm.editEmployee(vm.workers[1]);vm.employeeDraft.device='ESP32S3';vm.publishPersonnel=async next=>{vm.workers=next;};await vm.saveEmployee();assert.equal(vm.workers[0].device,'');assert.equal(vm.boundEmployee.id,'EMP-002');assert.equal(vm.workers.filter(item=>item.device).length,1);
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

test('rebinding hides readings collected before the new assignment',()=>{
  const vm=room({updateTime:'read',bindingSince:10000,sensorTimestamp:9000});assert.equal(vm.hasReadings,false);assert.equal(vm.selectedHasReadings,false);vm.sensorTimestamp=11000;assert.equal(vm.hasReadings,true);
});

test('a binding changed while the page was closed clears persisted history even if the employee is the same',()=>{
  const storage=new Map([['mine-safe-binding-stamp-v1',1000]]);
  globalThis.uni={getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,value)};
  const vm=room({bindingSince:3000,updateTime:'old',sensorTimestamp:2000});
  vm.historyRecords.heartRate=[{value:78,time:'old'}];
  personnelSync.methods.applyPersonnel.call(vm,vm.workers);
  assert.deepEqual(vm.historyRecords.heartRate,[]);
  assert.deepEqual(storage.get('sensorHistoryRecords').heartRate,[]);
  assert.equal(storage.get('mine-safe-binding-stamp-v1'),3000);
  assert.equal(vm.sensorTimestamp,0);
});
