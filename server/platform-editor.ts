import {createHash} from 'node:crypto';
import type {Express} from 'express';
import {pool} from './db';
import {createEditorSource} from './platform-editor-source';
export function courseEditor(app:Express){return createEditorSource(app,{provider:'courses',editorPath:'/admin',resolve:async actor=>{
 const id='zt-editor-'+createHash('sha256').update(actor.id).digest('hex').slice(0,40);
 await pool.query("INSERT INTO users(id,first_name,role,status) VALUES($1,$2,'admin','active') ON CONFLICT(id) DO NOTHING",[id,actor.fullName]);
 const u=(await pool.query("SELECT role,status FROM users WHERE id=$1",[id])).rows[0];if(u?.role!=='admin'||u.status!=='active')throw Object.assign(Error('Manba admin hisobi yopilgan'),{status:403});return id;
},attach:(req,ctx)=>{req.user={id:ctx.nativeId,claims:{sub:ctx.nativeId,role:'admin',name:ctx.actor.fullName}};}})}
