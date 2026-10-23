/** Staging-only candidate tool. Does not replace the private v1 backup workflow. */
import {SQL} from 'bun';
import {parseArgs} from 'node:util';
import {connectionConfig,safeQuery} from '../account-backup/cli.ts';
import {assertCznBackupRole} from './contract.ts';
import {readCznSnapshot,restoreCznSnapshot} from './backup.ts';
import {encryptCzn,decryptCzn} from './encryption.ts';
import contract from '../../supabase/backup-contract.czn-v2.json';
async function main(){
  const {positionals,values}=parseArgs({args:process.argv.slice(2),allowPositionals:true,options:{
    'project-ref':{type:'string'},'source-revision':{type:'string'},output:{type:'string'},snapshot:{type:'string'},identity:{type:'string'},
    write:{type:'boolean'},'all-profiles':{type:'boolean'}}});
  const project=values['project-ref'],command=positionals[0];
  if(positionals.length!==1||!['backup','validate','restore'].includes(command??'')||!project||!/^[a-z]{20}$/.test(project))throw new Error('Expected backup|validate|restore --project-ref STAGING_REF');
  if(project==='vzzudezdigjwbwfejlsg')throw new Error('Production is blocked by the CZN candidate CLI');
  if(command==='backup'){
    if(!values.output||!values['source-revision']||!/^[a-f0-9]{40}$/.test(values['source-revision'])||values.snapshot||values.identity||values.write||values['all-profiles'])throw new Error('Expected --output and immutable --source-revision only');
    const sql=new SQL(connectionConfig(process.env.BACKUP_DATABASE_URL??'',project,true));
    try{const query=safeQuery(sql);await query('begin isolation level repeatable read read only');
      await assertCznBackupRole(query);const snapshot=await readCznSnapshot(query,{createdAt:new Date().toISOString(),projectRef:project,
        sourceRevision:values['source-revision'],schemaSha256:contract.schemaSha256,migrationSha256:contract.migrationSha256},contract.schemaSha256);
      await query('commit');await encryptCzn(values.output,snapshot,process.env.AGE_RECIPIENT??'');
      console.log('Encrypted CZN staging snapshot pair written');
    }finally{await sql.close();}return;
  }
  if(!values.snapshot||!values.identity||values.output||values['source-revision'])throw new Error('Expected --snapshot and --identity');
  const snapshot=await decryptCzn(values.snapshot,values.identity,project,contract.schemaSha256);
  if(command==='validate'){if(values.write||values['all-profiles'])throw new Error('Restore flags not allowed');console.log('CZN snapshot validated');return;}
  if(!values.write||!values['all-profiles'])throw new Error('Staging restore requires explicit --write --all-profiles');
  const sql=new SQL(connectionConfig(process.env.RESTORE_DATABASE_URL??'',project,false));
  try{await restoreCznSnapshot(safeQuery(sql),snapshot,project,contract.schemaSha256);console.log('CZN staging recovery verified');}finally{await sql.close();}
}
if(import.meta.main)main().catch(()=>{console.error('CZN candidate operation failed; inspect locally without sharing credentials or row data');process.exitCode=1;});
