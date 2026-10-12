const ENDPOINT = '/.netlify/functions/personnel';
export default {
  data() {return {syncToken:'',syncTokenDraft:'',syncDialog:false,syncError:'',syncBusy:false,syncLoading:false,cloudRevision:0,cloudNextId:5,cloudLoaded:false,editorStale:false,syncAck:null,syncTimer:null,deleteDraft:null};},
  computed: {
    syncLabel() {
      if (!this.syncToken) return '未连接档案云端';
      if (this.syncError) return this.syncError;
      if (!this.cloudLoaded) return '正在连接档案云端';
      if (!this.cloudRevision) return '云端尚未建立档案';
      if (this.syncAck?.revision === this.cloudRevision) return this.clockNow-Date.parse(this.syncAck.receivedAt)<45000?'P4 已同步 · 版本 '+this.cloudRevision:'P4 已应用版本 '+this.cloudRevision+' · 当前离线';
      return '等待 P4 同步 · 版本 '+this.cloudRevision;
    }
  },
  onLoad() {
    if (this.syncToken) this.loadCloudEmployees();
    this.syncTimer=setInterval(()=>{if(this.syncToken&&!this.syncBusy) this.loadCloudEmployees();},5000);
  },
  onUnload() {clearInterval(this.syncTimer);},
  methods: {
    async personnelRequest(query='',body=null) {
      const response=await fetch(ENDPOINT+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+this.syncToken,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();
      if (!response.ok) throw Error(result.error||'档案服务连接失败');
      return result;
    },
    async connectPersonnel() {
      if (!this.syncTokenDraft.trim()) {this.syncError='请输入管理口令';return;}
      this.syncToken=this.syncTokenDraft.trim();this.cloudLoaded=false;this.syncError='';
      await this.loadCloudEmployees();
      if (this.cloudLoaded) {this.syncDialog=false;this.syncTokenDraft='';}
    },
    applyPersonnel(employees) {
      const old=this.workers.find(item=>item.device)?.id;
      const next=normalizeForSync(employees);
      if (old!==next.find(item=>item.device)?.id) {
        for (const key of Object.keys(this.historyRecords||{})) this.historyRecords[key]=[];
        this.updateTime='';this.sensorTimestamp=0;
      }
      this.workers=next;
      if (!next.some(item=>item.id===this.selectedEmployeeId)) this.selectedEmployeeId=next[0]?.id||'';
      try {uni.setStorageSync('mine-safe-employees-v1',next);}catch{this.notify('云端已保存，本机缓存空间不足');}
    },
    async loadCloudEmployees() {
      if (this.syncLoading) return;
      this.syncLoading=true;
      try {
        const doc=await this.personnelRequest();
        this.syncAck=doc.ack;this.syncError='';this.cloudLoaded=true;this.cloudNextId=doc.nextId;
        if(doc.revision!==this.cloudRevision&&doc.revision>0) {
          this.cloudRevision=doc.revision;this.applyPersonnel(doc.employees);
          if(this.employeeEditorOpen) {this.editorStale=true;this.editorError='云端档案已变化，请关闭并重新编辑，避免覆盖他人修改';}
        }
      }catch(error){this.syncError=error.message||'档案云端连接中断';}finally{this.syncLoading=false;}
    },
    async publishPersonnel(employees) {
      if(!this.syncToken||!this.cloudLoaded) throw Error('请先连接档案云端，再保存到基站');
      if(this.syncBusy||this.syncLoading) throw Error('正在同步，请稍后再保存');
      this.syncBusy=true;
      try {
        const prepared=[];
        for(const employee of employees) {
          const item={...employee};
          if(item.avatar.startsWith('data:')&&!item.avatarKey) {
            const image=await loadImage(item.avatar),canvas=document.createElement('canvas');canvas.width=canvas.height=128;
            const context=canvas.getContext('2d');context.drawImage(image,0,0,128,128);
            item.avatar=canvas.toDataURL('image/jpeg',.8);
            const rgba=context.getImageData(0,0,128,128).data,bytes=new Uint8Array(32768);
            for(let i=0;i<16384;i++){const pixel=((rgba[i*4]>>3)<<11)|((rgba[i*4+1]>>2)<<5)|(rgba[i*4+2]>>3);bytes[i*2]=pixel&255;bytes[i*2+1]=pixel>>8;}
            let binary='';for(const byte of bytes) binary+=String.fromCharCode(byte);
            item.avatarKey=(await this.personnelRequest('?action=photo',{rgb565:btoa(binary)})).key;
          }
          if(!item.avatar.startsWith('data:')) item.avatarKey='';
          prepared.push(item);
        }
        const doc=await this.personnelRequest('',{revision:this.cloudRevision,employees:prepared});
        this.cloudRevision=doc.revision;this.cloudNextId=doc.nextId;this.syncError='';this.applyPersonnel(doc.employees);
        this.notify('档案已保存到云端，等待 P4 应用版本 '+doc.revision);
      }finally{this.syncBusy=false;}
    },
    async initializeCloud() {try{await this.publishPersonnel(this.workers);}catch(error){this.notify(error.message);}},
    async deleteEmployee() {
      if(!this.deleteDraft||this.syncBusy) return;
      try{await this.publishPersonnel(this.workers.filter(item=>item.id!==this.deleteDraft.id));this.deleteDraft=null;}catch(error){this.notify(error.message);}
    }
  }
};
import {normalizeEmployees as normalizeForSync} from './personnel.js';
function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('照片无法解码'));image.src=src;});}
