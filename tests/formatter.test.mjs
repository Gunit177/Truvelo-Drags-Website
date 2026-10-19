import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,decimal,sql,csv,dateString} from '../dist/formatter-core.js';
import * as XLSX from '../dist/assets/xlsx.js';
const options={eventId:'001a75ad-1f0a-5eb4-805c-2e7fefefde2a',date:'2026-09-20',system:'02',quarterConfirmed:true,excludeCalibration:true,excludeUnnumbered:true};
const base={Run:1,CCDate:'2026-09-20',TrackType:400};
for(const n of [1,2])Object.assign(base,{['ID'+n]:n,['Driver'+n]:"O'Neil",['Car'+n]:'Car',['Class'+n]:'A',['React'+n]:-0.058,['Sixty'+n]:2.1235,['QuartT'+n]:12.34,['QuartS'+n]:180.5});
const rows=(...records)=>[Object.keys(base),...records.map(r=>Object.keys(base).map(k=>r[k]))];
test('preserves timing units, negative reactions, decimal half-up and two lanes',()=>{
 const p=validate(rows(base),options);assert.equal(p.errors.length,0);assert.equal(p.results.length,2);assert.equal(p.results[0].sixty_ft,'2.124');assert.equal(p.results[0].reaction,'-0.058');assert.equal(p.results[0].speed,'180.500');assert.equal(decimal('1.0055'),'1.006');assert.equal(decimal('-1.0055'),'-1.006');
});
test('exclusions require confirmation and are recorded per lane',()=>{
 const data=rows({...base,Run:null},{...base,Run:2,ID1:999,Driver1:'Truvelo',ID2:0,Driver2:'No driver'},base);
 const p=validate(data,options);assert.equal(p.excluded.length,4);assert.equal(p.results.length,2);assert.equal(p.errors.length,0);
 assert.equal(validate(data,{...options,excludeUnnumbered:false}).errors.length,2);
});
test('blocks invalid schema, duplicates, dates, missing metrics and unsupported distances',()=>{
 assert.throws(()=>validate([['Run']],options),/column/);
 assert.equal(validate(rows(base,base),options).errors.length,2);
 for(const patch of [{CCDate:'2026-09-21'},{TrackType:200},{React1:null},{QuartS1:'NaN'},{Sixty1:99},{Run:0},{Driver1:'=WEBSERVICE("evil")'}])assert.ok(validate(rows({...base,...patch}),options).errors.length);
 assert.throws(()=>dateString('2026-02-30'));
});
test('SQL escapes names and backslashes, checks event identity and rejects existing results',()=>{
 const p=validate(rows({...base,Car1:'A\\B'}),options),s=sql(p);
 assert.match(s,/O''Neil/);assert.ok(s.includes('A\\\\B'));assert.match(s,/published=false FOR UPDATE/);assert.match(s,/already has results/);assert.match(s,/system_id=E'02'/);assert.match(s,/COMMIT;/);
 assert.throws(()=>sql(validate(rows({...base,QuartT1:null}),options)),/validation/);
});
test('CSV reader preserves quoted commas and original legacy header layout',()=>{
 const source=csv([{...base,Driver1:'Driver, One'}],Object.keys(base));
 const workbook=XLSX.read(source,{type:'string',cellDates:true});
 const loaded=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{header:1,defval:null,raw:true});
 const p=validate(loaded,options);assert.equal(p.errors.length,0);assert.equal(p.results[0].driver,'Driver, One');
});
