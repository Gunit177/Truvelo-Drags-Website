import * as XLSX from './assets/xlsx.js';
import {validate,csv,sql,columns} from './formatter-core.js';
const $=id=>document.getElementById(id);
let book,pack,source,revision=0;
function clear(){pack=null;$('reviewed').checked=false;$('reviewed').disabled=true;for(const id of ['csv','sql','report'])$(id).disabled=true;$('preview').replaceChildren();$('issues').textContent='';}
function invalidate(){revision++;clear();$('status').textContent='Inputs changed. Validate again before downloading.';}
$('form').addEventListener('input',invalidate);$('sheet').addEventListener('change',invalidate);
$('file').addEventListener('change',async()=>{
  invalidate();const current=revision;book=null;$('sheet').replaceChildren();$('sheet').disabled=true;
  try{
    const file=$('file').files[0];if(!file)return;
    if(file.size>10*1024*1024 || !/\.(xlsx|csv)$/i.test(file.name))throw Error('Choose an .xlsx or .csv file smaller than 10 MB.');
    const bytes=await file.arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    if(current!==revision)return;
    source={filename:file.name,sha256:Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')};
    book=XLSX.read(bytes,{type:'array',cellDates:true,cellFormula:true});
    for(const name of book.SheetNames)$('sheet').add(new Option(name,name));
    if(book.SheetNames.includes('log'))$('sheet').value='log';
    $('sheet').disabled=false;$('status').textContent='File loaded. Check the worksheet and event details, then validate.';
  }catch(e){$('status').textContent=e.message;}
});
$('form').addEventListener('submit',event=>{
  event.preventDefault();clear();
  try{
    if(!book)throw Error('Choose a results file first.');
    const sheet=book.Sheets[$('sheet').value];
    if(!sheet['!ref'])throw Error('The selected sheet is empty.');
    const range=XLSX.utils.decode_range(sheet['!ref']);
    if(range.e.r>20000 || range.e.c>200)throw Error('Sheet exceeds 20,000 rows or 201 columns.');
    for(const [cell,value] of Object.entries(sheet))if(!cell.startsWith('!') && value.f)throw Error(`Formula found at ${cell}. Use the original values-only timing export.`);
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:null,raw:true,range:0});
    pack=validate(rows,{eventId:$('eventId').value.trim(),date:$('date').value,system:$('system').value,quarterConfirmed:$('quarter').checked,excludeCalibration:$('calibration').checked,excludeUnnumbered:$('unnumbered').checked,excludeInvalid:$('invalid').checked});
    pack.source={...source,sheet:$('sheet').value};
    $('status').textContent=`${pack.results.length} valid results; ${pack.excluded.length} excluded lanes; ${pack.errors.length} errors. Event ${pack.options.eventId}, ${pack.options.date}, system ${pack.options.system}.` + (pack.errors.length ? ' Review the errors below. Correct the source, or select the option in step 2 to exclude invalid results, then validate again.' : ' Review every exclusion before confirming and downloading.');
    $('issues').textContent=[...pack.errors.map(r=>`ERROR row ${r.source_row}, lane ${r.lane}: ${r.reason}`),...pack.excluded.map(r=>`EXCLUDED row ${r.source_row}, lane ${r.lane}, run ${r.run_no}: ${r.reason}`)].join('\n');
    const table=document.createElement('table'),head=table.createTHead().insertRow();
    const visible=columns.filter(k=>k!=='event_id');
    for(const k of visible){const th=document.createElement('th');th.textContent=k;head.append(th);}
    const body=table.createTBody();for(const r of pack.results.slice(0,50)){const tr=body.insertRow();for(const k of visible)tr.insertCell().textContent=r[k];}
    $('preview').append(table);const note=document.createElement('p');note.textContent='Preview shows the first 50 valid results. The review report includes all rows and original timing values.';$('preview').append(note);
    $('report').disabled=false;$('reviewed').disabled=pack.errors.length>0;
  }catch(e){pack=null;$('status').textContent=e.message;}
});
$('reviewed').addEventListener('change',()=>{for(const id of ['csv','sql'])$(id).disabled=!pack || pack.errors.length>0 || !$('reviewed').checked;});
function download(extension,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=`results-${pack.options.date}-${pack.options.eventId}.${extension}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('csv').onclick=()=>{if(pack && !pack.errors.length && $('reviewed').checked)download('csv',csv(pack.results),'text/csv;charset=utf-8');};
$('sql').onclick=()=>{if(pack && !pack.errors.length && $('reviewed').checked)download('sql',sql(pack),'text/plain;charset=utf-8');};
$('report').onclick=()=>{if(pack)download('review.json',JSON.stringify(pack,null,2),'application/json');};
