// Legacy two-lane export -> reviewed quarter-mile results. No network or DB access.
export const columns = ['event_id','run_no','lane','driver','vehicle','race_class','reaction','sixty_ft','elapsed','speed'];
const blank = v => v === null || v === undefined || String(v).trim() === '';
const text = v => blank(v) ? '' : String(v).trim();
export function decimal(v) {
  const s = text(v);
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) throw Error('Expected a decimal number');
  const negative = s.startsWith('-');
  const [whole, fraction=''] = s.replace(/^[+-]/,'').split('.');
  let n = BigInt(whole) * 1000n + BigInt((fraction+'000').slice(0,3));
  if (Number(fraction[3] || 0) >= 5) n++;
  if (n >= 1000000000n) throw Error('Outside database numeric(9,3) range');
  return (negative && n ? '-' : '') + (n / 1000n) + '.' + String(n % 1000n).padStart(3,'0');
}
export function dateString(value) {
  if (value instanceof Date && !isNaN(value)) return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  const s = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || new Date(s+'T00:00:00Z').toISOString().slice(0,10) !== s) throw Error('Use a valid date in YYYY-MM-DD format');
  return s;
}
export function validate(rows, options) {
  if (!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(options.eventId)) throw Error('Copy the event ID from Supabase events (a UUID).');
  dateString(options.date);
  if (!['01','02','03'].includes(options.system)) throw Error('Select the timing system.');
  if (!options.quarterConfirmed) throw Error('Confirm TrackType 400 means quarter mile and QuartS is km/h.');
  if (!rows.length || rows.length > 20001) throw Error('Choose a sheet with 1–20,000 data rows.');
  const headers = rows[0].map(text);
  const required = ['Run','CCDate','TrackType', ...[1,2].flatMap(n=>['ID','Driver','Car','Class','React','Sixty','QuartT','QuartS'].map(k=>k+n))];
  for (const h of required) if (headers.filter(v=>v===h).length !== 1) throw Error(`Missing or duplicate column: ${h}`);
  const results=[], excluded=[], errors=[], lineage=[], seen=new Set();
  rows.slice(1).forEach((values,i)=>{
    if (values.every(blank)) return;
    const row=Object.fromEntries(headers.map((h,j)=>[h, values[j]]));
    for (const lane of [1,2]) {
      const audit={source_row:i+2,lane,run_no:row.Run ?? '',competitor_id:row['ID'+lane] ?? '',driver:text(row['Driver'+lane])};
      let reason='';
      if (blank(row.Run) && options.excludeUnnumbered) reason='Faulty unnumbered run (confirmed exclusion)';
      else if (String(row['ID'+lane])==='0' && text(row['Driver'+lane]).toLowerCase()==='no driver') reason='Empty lane';
      else if (options.excludeCalibration && String(row['ID'+lane])==='999' && text(row['Driver'+lane]).toLowerCase()==='truvelo') reason='Calibration ID 999 / Truvelo (confirmed exclusion)';
      if (reason) { excluded.push({...audit,reason}); continue; }
      try {
        if (!/^\d+$/.test(text(row.Run)) || Number(row.Run)<1 || Number(row.Run)>2147483647) throw Error('Missing or invalid run number');
        if (dateString(row.CCDate)!==options.date) throw Error('Captured date does not match event date');
        if (Number(row.TrackType)!==400) throw Error('Unsupported TrackType: this formatter supports quarter-mile exports with TrackType 400');
        const key=Number(row.Run)+':'+lane;
        if (seen.has(key)) throw Error('Duplicate run and lane');
        seen.add(key);
        const result={event_id:options.eventId.toLowerCase(),run_no:Number(row.Run),lane,driver:audit.driver,vehicle:text(row['Car'+lane]),race_class:text(row['Class'+lane])};
        for (const [field,max] of [['driver',150],['vehicle',150],['race_class',80]]) {
          if (result[field].length>max || (field==='driver' && !result[field])) throw Error(`Invalid ${field} length`);
          if (/[\u0000-\u001f]/.test(result[field])) throw Error(`Control character in ${field}`);
          if (/^[=+@-]/.test(result[field])) throw Error(`Spreadsheet formula-like text in ${field}; review source`);
        }
        for (const [target,source] of [['reaction','React'],['sixty_ft','Sixty'],['elapsed','QuartT'],['speed','QuartS']]) {
          try { result[target]=decimal(row[source+lane]); } catch(e) { throw Error(`${source+lane}: ${e.message}`); }
        }
        if (+result.sixty_ft<=0 || +result.elapsed<=+result.sixty_ft || +result.speed<=0) throw Error('Require positive speed and 0 < sixty-foot time < quarter-mile ET');
        results.push(result);
        lineage.push({...audit,raw_reaction:row['React'+lane],raw_sixty_ft:row['Sixty'+lane],raw_elapsed:row['QuartT'+lane],raw_speed:row['QuartS'+lane],captured_date:options.date});
      } catch(e) {
        const issue={...audit,reason:e.message,raw_source:row};
        if (options.excludeInvalid === true) excluded.push({...issue,exclusion_type:'validation_error',confirmed:true});
        else errors.push(issue);
      }
    }
  });
  if (!results.length) errors.push({source_row:'',lane:'',reason:'No valid results found'});
  return {options,results,excluded,errors,lineage};
}
export function csv(rows, fields=columns) {
  const quote=v=>'"'+String(v ?? '').replaceAll('"','""')+'"';
  return fields.map(quote).join(',')+'\r\n'+rows.map(r=>fields.map(k=>quote(r[k])).join(',')).join('\r\n')+'\r\n';
}
const sqlText = v => "E'"+String(v).replaceAll('\\','\\\\').replaceAll("'","''")+"'";
export function sql(pack) {
  if(pack.errors.length || !pack.results.length) throw Error('Resolve validation errors first.');
  const {eventId,date,system}=pack.options;
  // Identifiers are fixed; all data uses escaped SQL string literals.
  return `-- Run once in the website project's SQL Editor. Event must exist and be unpublished.
-- A failure rolls back every inserted result. Existing results are never replaced.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext(${sqlText(eventId)}));
DO $$ BEGIN
  PERFORM 1 FROM public.events WHERE id=${sqlText(eventId)} AND date=${sqlText(date)} AND system_id=${sqlText(system)} AND distance='1/4 mile' AND published=false FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event missing, published, or date/system/distance mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM public.race_results WHERE event_id=${sqlText(eventId)}) THEN RAISE EXCEPTION 'This event already has results. Review instead of importing twice.'; END IF;
END $$;
INSERT INTO public.race_results (${columns.join(',')}) VALUES
${pack.results.map(r=>'('+columns.map(k=>sqlText(r[k])).join(',')+')').join(',\n')};
DO $$ BEGIN
  IF (SELECT count(*) FROM public.race_results WHERE event_id=${sqlText(eventId)}) <> ${pack.results.length} THEN RAISE EXCEPTION 'Result count mismatch'; END IF;
END $$;
COMMIT;
-- Verify the count and timings, then publish the event separately.
SELECT count(*) AS imported_results FROM public.race_results WHERE event_id=${sqlText(eventId)};
`;
}
