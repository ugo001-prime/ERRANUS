const fs = require('fs');

const files = ['index.html', 'frontend-preview.html'];
const clientScript = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
const permanentFooter = '<footer class="site-footer">© 2026 PRIME TECHNOLOGIES INC. All rights reserved.</footer>';
const profileModalScript = fs.readFileSync('scripts/profile-modal.js', 'utf8');
const profileOverride = profileModalScript.replace('window.profile = function () {', 'profile = function () {');
const backend = `<script>
// Supabase uses a publishable browser key. Database access is protected by RLS policies.
let sb = window.supabase.createClient('https://hfxlpsumohqhjsfjtfkd.supabase.co', 'sb_publishable_cKBepyjHKEi6E5Wh6MYzIg_SnPmLdKs');
const emailConfirmationReturn = /access_token|type=signup|code=/.test(location.hash + location.search);
const passwordRecoveryReturn = /type=recovery/.test(location.hash + location.search);
const dbStatus = message => note(message);
const statusLabel = value => ({open:'Open',accepted:'Accepted',in_progress:'In progress',completion_requested:'Completion requested',completed:'Completed',cancelled:'Cancelled'}[value] || value);
async function loadRemoteTasks(){
  if(!auth?.id) return;
  tasks=[];
  const {data,error}=await sb.from('tasks').select('*').order('created_at',{ascending:false});
  if(error){console.error(error);render();return;}
  const seenTasks=new Set();
  tasks=data.map(t=>({id:t.id,clientId:t.client_id,workerId:t.worker_id,title:t.title,category:t.category,area:t.public_area,amount:Number(t.amount),duration:t.duration,description:t.description,owner:t.client_id===auth.id?'client':'other',worker:t.worker_id===auth.id?'worker':t.worker_id?'other':undefined,status:statusLabel(t.status),signature:t.worker_signature})).filter(task=>{const key=[task.clientId,task.workerId||'',task.title,task.category,task.area,task.amount,task.duration,task.description,task.status].join('|');if(seenTasks.has(key))return false;seenTasks.add(key);return true;});
  await loadParticipantProfiles();
  await loadRemoteMessages();
  render();
}
let remoteMessages=[];
let participantProfiles={};
async function loadParticipantProfiles(){
  const ids=[...new Set(tasks.flatMap(t=>[t.clientId,t.workerId]).filter(Boolean))];
  participantProfiles={};
  if(!ids.length)return;
  const {data,error}=await sb.from('profiles').select('id,full_name,username').in('id',ids);
  if(error){console.warn('Profiles could not load:',error.message);return;}
  participantProfiles=Object.fromEntries((data||[]).map(profile=>[profile.id,profile]));
}
async function loadRemoteMessages(){
  remoteMessages=[];
  const taskIds=tasks.filter(t=>t.clientId===auth?.id||t.workerId===auth?.id).map(t=>t.id);
  if(!taskIds.length)return;
  const {data,error}=await sb.from('messages').select('id,task_id,sender_id,body,created_at').in('task_id',taskIds).order('created_at',{ascending:true});
  if(error){console.warn('Messages could not load:',error.message);return;}
  remoteMessages=data||[];
}
function conversationPerson(task){
  const otherId=task?.clientId===auth?.id?task.workerId:task?.clientId;
  const profile=participantProfiles[otherId]||{};
  return {name:profile.full_name||'Erranus user',username:profile.username||'user'};
}
function taskConversationName(task){return task?.title||'Task conversation';}
function messageTime(value){if(!value)return '';const date=new Date(value),today=new Date();return date.toDateString()===today.toDateString()?date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):date.toLocaleDateString([], {month:'short',day:'numeric'});}
function messagesInbox(){
  const messageTaskIds=[...new Set(remoteMessages.map(m=>m.task_id))];
  const conversations=messageTaskIds.map(id=>{const task=tasks.find(t=>t.id===id),thread=remoteMessages.filter(m=>m.task_id===id),last=thread[thread.length-1],person=conversationPerson(task);return {id,task,last,count:thread.length,person};});
  const available=tasks.filter(t=>t.clientId===auth?.id||t.workerId===auth?.id);
  const cards=conversations.map(c=>'<button class="chat-row" type="button" onclick="openConversation(null,&quot;'+c.id+'&quot;)"><span class="chat-avatar">'+safe(initials(c.person.name))+'</span><span class="chat-row-main"><b>'+safe(c.person.name)+'</b><small>'+safe(c.last?.body||'Start a conversation')+'</small></span><span class="chat-row-time">'+messageTime(c.last?.created_at)+'</span></button>').join('');
  return '<div class="chat-inbox"><div class="ey">MESSAGES</div><h1 class="title">Your chats</h1>'+(cards?'<div class="chat-list">'+cards+'</div>':'<div class="card">No chats yet. Open an assigned task and select Message to start a conversation.</div>')+(available.length?'<div class="banner"><b>Task messaging</b><p class="small">Chats are visible only to the client and assigned worker.</p></div>':'')+'</div>';
}
function openConversation(name,taskId=current?.id){
  if(!taskId){tab='messages';render();return note('Choose an assigned task to start messaging.');}
  const task=tasks.find(t=>t.id===taskId),person=conversationPerson(task),thread=remoteMessages.filter(m=>m.task_id===taskId);
  const body=thread.length?thread.map(m=>'<div class="chat-bubble '+(m.sender_id===auth?.id?'outgoing':'incoming')+'">'+safe(m.body)+'<small>'+messageTime(m.created_at)+'</small></div>').join(''):'<p class="small">No messages yet. Start the conversation.</p>';
  $('#dialog').innerHTML='<div class="chat-window"><div class="chat-header"><button class="secondary" type="button" onclick="closeModal();go(&quot;messages&quot;)">←</button><span class="chat-avatar">'+safe(initials(person.name))+'</span><span class="chat-header-copy"><b>'+safe(person.name)+'</b><small>@'+safe(person.username)+' · '+safe(taskConversationName(task))+'</small></span></div><div class="chat-thread">'+body+'</div><form class="chat-compose" onsubmit="sendMessage(event,&quot;'+taskId+'&quot;)"><input name="message" required maxlength="2000" autocomplete="off" placeholder="Write a message..."><button type="submit">Send</button></form></div>';
  $('#modal').className='modal open chat-modal';
}
async function sendMessage(e,taskId){
  e.preventDefault();const body=String(new FormData(e.target).get('message')||'').trim();if(!body)return;
  const {error}=await sb.from('messages').insert({task_id:taskId,sender_id:auth.id,body});
  if(error)return note(error.message);
  await loadRemoteMessages();note('Message sent.');openConversation('',taskId);
}
async function useRemoteSession(user){
  const [{data:profileResult},{data:privateResult}]=await Promise.all([
    sb.from('profiles').select('*').eq('id',user.id).single(),
    sb.from('private_profiles').select('*').eq('id',user.id).single()
  ]);
  const profile=profileResult || {};
  const accounts=JSON.parse(localStorage.erranusAccounts||'{}');
  // Remove stale copies of this same account before saving the latest server profile.
  for(const [email,record] of Object.entries(accounts)) if(email!==user.email&&record?.id===user.id) delete accounts[email];
  const latestAccount={id:user.id,name:profile.full_name||user.user_metadata?.full_name||user.email.split('@')[0]||'',username:profile.username||user.user_metadata?.username||'',phone:privateResult?.phone_number||user.user_metadata?.phone_number||'',role:profile.account_type||user.user_metadata?.account_type||'dual',rating:Number(profile.rating||0),completed:Number(profile.completed_task_count||0)};
  accounts[user.email]=latestAccount;
  localStorage.erranusAccounts=JSON.stringify(accounts);
  auth={id:user.id,email:user.email,name:latestAccount.name,role:latestAccount.role,isAdmin:user.email === 'ogbogumichael03@gmail.com',emailVerified:!!user.email_confirmed_at};
  role=auth.role;
  sessionStorage.erranusAccount=JSON.stringify(auth);
  $('#auth').className='auth'; $('#landing').hidden=true; $('.shell').hidden=false; tab='dashboard';
  await loadRemoteTasks(); setupTaskUpdates(); render(); $('#appLoader').hidden=true;
}
async function authenticate(e){
  e.preventDefault(); const f=new FormData(e.target),email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('password')||'');
  if(authView==='reset'){
    if(!email) return dbStatus('Enter your email address.');
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin});
    return dbStatus(error?error.message:'Password reset email sent. Check your inbox.');
  }
  if(authView==='newpassword'){
    if(password.length<6) return dbStatus('Your new password must have at least 6 characters.');
    if(password!==String(f.get('confirmPassword')||'')) return dbStatus('Passwords do not match.');
    const {error}=await sb.auth.updateUser({password});
    if(error) return dbStatus(error.message);
    e.target.reset(); await sb.auth.signOut(); auth=null; $('#accountTools').innerHTML=''; history.replaceState(null,'',location.pathname); authMode('signin');
    return dbStatus('Password updated successfully. Log in with your new password.');
  }
  if(authView==='signup'){
    if(password!==String(f.get('confirmPassword')||'')) return dbStatus('Passwords do not match.');
    const username=String(f.get('username')||'').trim().toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(username))return dbStatus('Username must use 3–24 letters, numbers or underscores.');
    const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:String(f.get('name')||'').trim(),username,phone_number:String(f.get('phone')||'').trim(),account_type:String(f.get('role')||'worker')}}});
    if(error) return dbStatus(error.message);
    e.target.reset();
    if(data.session) await useRemoteSession(data.user); else {authMode('signin');dbStatus('Account created. Check your email to confirm it, then log in.');}
    return;
  }
  sb=window.supabase.createClient('https://hfxlpsumohqhjsfjtfkd.supabase.co', 'sb_publishable_cKBepyjHKEi6E5Wh6MYzIg_SnPmLdKs',f.get('remember')?undefined:{auth:{persistSession:false}});
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error) return dbStatus(error.message);
  localStorage.erranusRememberedEmail=email;
  await useRemoteSession(data.user); dbStatus('You are logged in.');
}
async function signOut(){if(taskUpdatesChannel){sb.removeChannel(taskUpdatesChannel);taskUpdatesChannel=null;}await sb.auth.signOut();sessionStorage.removeItem('erranusAccount');localStorage.removeItem('erranusSession');auth=null;$('#appLoader').hidden=true;$('#landing').hidden=false;$('.shell').hidden=true;$('#accountTools').innerHTML='';dbStatus('You are signed out.');}
async function savePassword(e){e.preventDefault();const f=new FormData(e.target),next=String(f.get('next')||'');if(next!==String(f.get('confirm')||''))return dbStatus('New passwords do not match.');const {error}=await sb.auth.updateUser({password:next});if(error)return dbStatus(error.message);closeModal();dbStatus('Password updated.');}
async function saveAccount(e){e.preventDefault();const f=new FormData(e.target),name=String(f.get('name')||'').trim(),username=String(f.get('username')||'').trim().toLowerCase(),phone=String(f.get('phone')||'').trim(),accountType=String(f.get('role')||'worker'),about=String(f.get('about')||'').trim(),area=String(f.get('location')||'').trim(),languages=String(f.get('languages')||'').split(',').map(x=>x.trim()).filter(Boolean),nextEmail=String(f.get('email')||'').trim().toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(username))return dbStatus('Username must use 3–24 letters, numbers or underscores.');const [{error:profileError},{error:privateError}]=await Promise.all([sb.from('profiles').update({full_name:name,username,account_type:accountType,about,public_area:area,languages,updated_at:new Date().toISOString()}).eq('id',auth.id),sb.from('private_profiles').update({phone_number:phone}).eq('id',auth.id)]);if(profileError||privateError)return dbStatus((profileError||privateError).code==='23505'?'That username is already taken.':(profileError||privateError).message);const accounts=JSON.parse(localStorage.erranusAccounts||'{}');accounts[auth.email]={...(accounts[auth.email]||{}),name,username,phone,role:accountType,about,location:area,languages:languages.join(', ')};localStorage.erranusAccounts=JSON.stringify(accounts);auth.name=name;auth.role=accountType;role=accountType;sessionStorage.erranusAccount=JSON.stringify(auth);if(nextEmail&&nextEmail!==auth.email){const {error}=await sb.auth.updateUser({email:nextEmail});if(error)return dbStatus(error.message);dbStatus('Profile saved. Confirm the email sent to your new address before using it to log in.');}else dbStatus('Profile saved.');render();}
async function postTask(e){e.preventDefault();if(!isClient())return dbStatus('Only Client and Dual accounts can post tasks.');const f=new FormData(e.target);const {error}=await sb.from('tasks').insert({client_id:auth.id,title:String(f.get('title')).trim(),category:String(f.get('category')).trim(),public_area:String(f.get('area')).trim(),amount:Number(f.get('amount')),duration:String(f.get('duration')).trim(),description:String(f.get('description')).trim()});if(error)return dbStatus(error.message);tab='posted';await loadRemoteTasks();dbStatus('Task posted for workers to find.');}
async function accept(e){e.preventDefault();if(!isWorker())return dbStatus('Only Worker and Dual accounts can accept tasks.');const {error}=await sb.rpc('accept_task',{p_task_id:current.id,p_signature:String(new FormData(e.target).get('name')).trim()});if(error)return dbStatus(error.message);await loadRemoteTasks();dbStatus('Agreement signed. Details unlocked.');}
async function status(label){const map={'In progress':'in_progress','Completion requested':'completion_requested','Completed':'completed'};const {error}=await sb.rpc('update_task_status',{p_task_id:current.id,p_status:map[label]});if(error)return dbStatus(error.message);await loadRemoteTasks();dbStatus('Task updated: '+label);}
let completionRequestIds=new Set();
let taskUpdatesChannel=null;
const clientCompletionRequests=()=>tasks.filter(task=>task.owner==='client'&&task.status==='Completion requested');
function openCompletionRequest(id){closeModal();tab='posted';render();setTimeout(()=>openTask(id),0);}
function renderCompletionAlerts(){
  if(!auth)return;
  const requests=clientCompletionRequests();
  const accountButton=$('#accountTools .account-button');
  if(accountButton&&requests.length&&!accountButton.querySelector('.notification-dot'))accountButton.insertAdjacentHTML('beforeend','<span class="notification-dot" aria-label="'+requests.length+' completion request'+(requests.length===1?'':'s')+'">'+requests.length+'</span>');
  const old=$('#completionAlert'); if(old)old.remove();
  if(!requests.length)return;
  const task=requests[0];
  $('#app')?.insertAdjacentHTML('afterbegin','<section class="completion-alert" id="completionAlert"><div><span class="cat">COMPLETION REQUEST</span><b>Worker says “'+safe(task.title)+'” is finished.</b><p>Review the work, then confirm completion if you are satisfied.</p></div><button onclick="openCompletionRequest(&quot;'+task.id+'&quot;)">Review and confirm</button></section>');
}
const baseRender=render;
render=function(){baseRender();renderCompletionAlerts();};
window.showNotifications=function(){
  const requests=clientCompletionRequests();
  const body=requests.length?requests.map(task=>'<article class="notification-item"><b>Completion requested</b><p>'+safe(task.title)+' is ready for your review.</p><button onclick="openCompletionRequest(&quot;'+task.id+'&quot;)">Review and confirm</button></article>').join(''):'<p class="intro">You have no new task notifications.</p>';
  $('#dialog').innerHTML='<button class="secondary close" onclick="closeModal()">Close</button><div class="ey">NOTIFICATIONS</div><h1 class="title">Task updates</h1>'+body;
  $('#modal').className='modal open';
};
function setupTaskUpdates(){
  if(taskUpdatesChannel||!auth?.id)return;
  completionRequestIds=new Set(clientCompletionRequests().map(task=>task.id));
  taskUpdatesChannel=sb.channel('erranus-task-updates-'+auth.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'tasks'},async payload=>{
    if(payload.new?.client_id!==auth.id)return;
    const wasKnown=completionRequestIds.has(payload.new.id);
    await loadRemoteTasks();
    const isRequest=payload.new.status==='completion_requested';
    if(isRequest&&!wasKnown)note('Completion requested. Open Notifications to review and confirm.');
    completionRequestIds=new Set(clientCompletionRequests().map(task=>task.id));
  }).subscribe();
  setInterval(async()=>{
    if(auth&&!document.hidden&&['dashboard','posted','messages'].includes(tab)&&!$('#modal')?.classList.contains('open')){
      await loadRemoteTasks();
    }
  },30000);
}
canEdit = function(task){return !!task && task.owner==='client' && task.status==='Open';};
window.canDeleteTask = task => !!task && task.owner==='client' && task.status==='Open';
window.editTask = function(){
  if(!canEdit(current))return note('Only the client who posted an open task can edit it.');
  $('#dialog').innerHTML='<button class="secondary close" onclick="openTask(&quot;'+current.id+'&quot;)">Back</button><div class="ey">EDIT TASK</div><h1 class="title">Update task details</h1><form class="form" onsubmit="saveTaskEdit(event)"><label class="field">Task title<input name="title" required value="'+safe(current.title)+'"></label><label class="field">Category<input name="category" required value="'+safe(current.category)+'"></label><label class="field">Public area<input name="area" required value="'+safe(current.area)+'"></label><label class="field">Agreed pay (₦)<input name="amount" type="number" min="1" required value="'+current.amount+'"></label><label class="field">Expected duration<input name="duration" required value="'+safe(current.duration)+'"></label><label class="field">Work required<textarea name="description" required>'+safe(current.description)+'</textarea></label><button>Save changes</button></form>';
  $('#modal').className='modal open';
};
window.saveTaskEdit = async function(e){
  e.preventDefault(); if(!canEdit(current))return note('This task can no longer be edited.');
  const f=new FormData(e.target),update={title:String(f.get('title')).trim(),category:String(f.get('category')).trim(),public_area:String(f.get('area')).trim(),amount:Number(f.get('amount')),duration:String(f.get('duration')).trim(),description:String(f.get('description')).trim(),updated_at:new Date().toISOString()};
  const {error}=await sb.from('tasks').update(update).eq('id',current.id).eq('client_id',auth.id).is('worker_id',null);
  if(error)return note(error.message); await loadRemoteTasks(); closeModal(); note('Task updated.');
};
window.confirmDeleteTask = function(){
  if(!canDeleteTask(current))return note('Only the client who posted an open task can delete it.');
  $('#dialog').innerHTML='<button class="secondary close" onclick="openTask(&quot;'+current.id+'&quot;)">Back</button><div class="ey">DELETE TASK</div><h1 class="title">Delete this task?</h1><p class="intro">This removes the open task from workers. This cannot be undone.</p><div class="actions"><button style="background:#a23d35" onclick="deleteTask()">Delete task</button><button class="secondary" onclick="openTask(&quot;'+current.id+'&quot;)">Keep task</button></div>';
  $('#modal').className='modal open';
};
window.deleteTask = async function(){
  if(!canDeleteTask(current))return note('This task can no longer be deleted.');
  const id=current.id,{error}=await sb.from('tasks').delete().eq('id',id).eq('client_id',auth.id).is('worker_id',null);
  if(error)return note(error.message); closeModal(); await loadRemoteTasks(); tab='posted'; note('Task deleted.');
};
if(!document.querySelector('#usernameField'))$('#nameField').insertAdjacentHTML('afterend','<label class="field" id="usernameField" hidden>Username<input name="username" autocomplete="username" placeholder="e.g. michael_work"></label>');
function showRecoveryPassword(){
  authView='newpassword'; $('#auth').className='auth open'; $('#authChoices').hidden=true; $('#authForm').hidden=false; $('#authSwitch').hidden=true;
  for(const id of ['nameField','usernameField','emailField','phoneField','roleField','rememberField']){const field=$('#'+id);field.hidden=true;field.style.display='none';const input=field.querySelector('input,select');if(input)input.required=false;}
  const passwordField=$('#passwordLabel').parentElement,passwordInput=passwordField.querySelector('input'),confirm=$('#confirmPasswordField'),confirmInput=confirm.querySelector('input');
  passwordField.hidden=false; passwordInput.required=true; passwordInput.value=''; confirm.hidden=false; confirm.style.display='grid'; confirmInput.required=true; confirmInput.value='';
  $('#authTitle').textContent='Set a new password'; $('#authText').textContent='Choose and confirm your new password to finish resetting your account.'; $('#authSubmit').textContent='Save new password';
}
function authMode(m){authView=m;const landing=m==='landing',signup=m==='signup',reset=m==='reset';$('#authChoices').hidden=!landing;$('#authForm').hidden=landing;if(landing){$('#authTitle').textContent='Welcome to Erranus';$('#authText').textContent='Choose how you want to continue.';$('#authSwitch').hidden=true;return;}$('#authSwitch').hidden=false;$('#nameField').hidden=!signup;$('#nameField').style.display=signup?'grid':'none';$('#nameField input').required=signup;$('#usernameField').hidden=!signup;$('#usernameField').style.display=signup?'grid':'none';$('#usernameField input').required=signup;$('#emailField').hidden=false;$('#emailField').style.display='grid';$('#emailField input').required=true;$('#phoneField').hidden=!signup;$('#phoneField').style.display=signup?'grid':'none';$('#phoneField input').required=signup;$('#roleField').hidden=!signup;$('#roleField').style.display=signup?'grid':'none';$('#roleField select').required=signup;$('#passwordLabel').parentElement.hidden=reset;$('#confirmPasswordField').hidden=!signup;$('#confirmPasswordField input').required=signup;$('#rememberField').hidden=signup||reset;if(m==='signin')$('#rememberField input').checked=true;$('#passwordLabel').parentElement.querySelector('input').required=!reset;$('#authTitle').textContent=signup?'Create your account':reset?'Forgotten password':'Log in';$('#authText').textContent=signup?'Enter your full name, username, email, phone number and password.':reset?'Enter your email address to receive a secure password-reset link.':'Enter your email and password to access your account.';$('#authSubmit').textContent=signup?'Sign up':reset?'Send reset email':'Log in';$('#authSwitch').innerHTML=signup?\`Already have an account? <a href="#" onclick="authMode('signin');return false">Log in</a>\`:reset?\`Back to <a href="#" onclick="authMode('signin');return false">log in</a>\`:\`New user? <a href="#" onclick="authMode('signup');return false">Sign up</a> · <a href="#" onclick="authMode('reset');return false">Forgotten password?</a>\`;}
const chatStyle=document.createElement('style');
chatStyle.textContent='.chat-inbox{max-width:680px;margin:auto}.chat-list{display:grid;gap:8px}.chat-row{width:100%;display:grid;grid-template-columns:46px 1fr auto;gap:12px;align-items:center;text-align:left;padding:13px 14px;background:var(--m);border:1px solid var(--l);border-radius:17px;color:var(--i)}.chat-row:hover{background:#edf5e8}.dark .chat-row{background:#183526}.dark .chat-row:hover{background:#254a34}.chat-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#d8ff5c;color:#173f2d;font-weight:900;font-size:13px}.chat-row-main{min-width:0;display:grid;gap:3px}.chat-row-main b,.chat-row-main small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chat-row-main small{color:var(--x)}.chat-row-time{font-size:11px;color:var(--x);white-space:nowrap;align-self:start}.chat-modal #dialog{width:min(560px,100%);height:min(720px,calc(100vh - 32px));padding:0;overflow:hidden;display:flex;flex-direction:column}.chat-window{display:flex;flex-direction:column;min-height:0;height:100%}.chat-header{display:grid;grid-template-columns:auto 44px 1fr;gap:10px;align-items:center;padding:15px 17px;border-bottom:1px solid var(--l)}.chat-header .secondary{padding:7px 9px}.chat-header-copy{display:grid;gap:2px;min-width:0}.chat-header-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chat-header-copy small{color:var(--x);font-size:11px}.chat-thread{flex:1;overflow:auto;padding:20px 17px;background:linear-gradient(180deg,#f8fbf5,#edf5e8)}.dark .chat-thread{background:linear-gradient(180deg,#102d20,#173c29)}.chat-bubble{max-width:78%;width:max-content;padding:10px 12px;border-radius:15px;margin:0 0 11px;line-height:1.42;font-size:14px}.chat-bubble.incoming{background:#fff;color:#173f2d;border-bottom-left-radius:4px}.chat-bubble.outgoing{margin-left:auto;background:#1d5a3d;color:#fff;border-bottom-right-radius:4px}.chat-bubble small{display:block;margin-top:5px;font-size:10px;opacity:.72}.chat-compose{display:flex;gap:8px;padding:12px;border-top:1px solid var(--l);background:var(--m)}.chat-compose input{flex:1;min-width:0;border:1px solid var(--l);border-radius:25px;padding:11px 14px;background:var(--m);color:var(--i);font:inherit}.chat-compose button{border-radius:25px;padding:10px 15px}@media(max-width:600px){.chat-modal{padding:0}.chat-modal #dialog{width:100%;height:100%;max-height:none;border-radius:0}.chat-thread{padding:16px 13px}.chat-row{grid-template-columns:43px 1fr auto}}';
document.head.appendChild(chatStyle);
const completionStyle=document.createElement('style');completionStyle.textContent='.notification-dot{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#d8ff5c;color:#173f2d;font-size:11px;font-weight:900;margin-left:7px}.completion-alert{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 auto 18px;max-width:980px;padding:17px 18px;background:#fff8dc;border:1px solid #e6c55f;border-left:5px solid #ce9a15;border-radius:18px;color:#513a00}.completion-alert b{display:block;margin-top:6px;font-size:16px}.completion-alert p{margin:5px 0 0;font-size:13px}.completion-alert button{white-space:nowrap;background:#173f2d}.notification-item{padding:15px 0;border-top:1px solid var(--l)}.notification-item:first-of-type{border-top:0}.notification-item p{margin:6px 0 10px;color:var(--x)}.dark .completion-alert{background:#41391e;border-color:#987a23;color:#fff4c1}@media(max-width:600px){.completion-alert{align-items:flex-start;flex-direction:column}.completion-alert button{width:100%}}';document.head.appendChild(completionStyle);
const profileStyle=document.createElement('style');profileStyle.textContent=\`.account-profile{max-width:720px;margin:auto}.profile-sheet{background:#fff;border:1px solid var(--l);border-radius:24px;overflow:hidden;box-shadow:0 12px 28px #143d2b12}.dark .profile-sheet,.dark .settings-section{background:#183526}.account-cover{height:128px;background:linear-gradient(120deg,#173f2d,#2f6e4c 62%,#a8cf43);position:relative}.account-cover:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 85% 12%,#d8ff5c66,transparent 32%)}.profile-head{padding:0 26px 24px;display:grid;grid-template-columns:88px 1fr;gap:16px;align-items:end}.profile-avatar-card{width:88px;height:88px;margin-top:-44px;background:#d8ff5c;color:#183d2d;border:5px solid #fff;border-radius:22px;display:grid;place-items:center;font-size:28px;font-weight:900;overflow:hidden;cursor:pointer}.dark .profile-avatar-card{border-color:#183526}.profile-avatar-card img{width:100%;height:100%;object-fit:cover}.profile-name-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.profile-name-row h1{font-size:25px;margin:0}.private-email{font-size:12px;color:var(--x);margin:5px 0 0}.profile-metrics{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--l);padding:18px 26px;gap:12px}.profile-metrics div{border-right:1px solid var(--l);padding-right:9px}.profile-metrics div:last-child{border:0}.profile-metrics b{display:block;font-size:18px;color:var(--g)}.settings-section{margin-top:18px;background:#fff;border:1px solid var(--l);border-radius:20px;padding:22px}.settings-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.setting-row{display:grid;grid-template-columns:150px 1fr;gap:16px;padding:15px 0;border-top:1px solid var(--l);align-items:center}.setting-row:first-of-type{border-top:0}.setting-row label{font-size:12px;font-weight:900;color:#587061;text-transform:uppercase;letter-spacing:.7px}.setting-row input,.setting-row textarea,.setting-row select{width:100%;border:0;background:transparent;color:var(--i);font:inherit;padding:4px 0}.setting-row textarea{min-height:65px;resize:vertical}.dark .setting-row input,.dark .setting-row textarea,.dark .setting-row select{color:#edf7ef}.profile-save{margin-top:18px;width:100%}@media(max-width:600px){.setting-row{grid-template-columns:1fr;gap:5px}.profile-metrics{padding:16px}.profile-head{padding-left:18px;padding-right:18px}}\`;document.head.appendChild(profileStyle);
function profile(){const account=getAccounts()[auth.email]||{name:auth.name,phone:'',role:role};const posted=tasks.filter(t=>t.owner==='client').length,done=tasks.filter(t=>t.status==='Completed'&&(t.owner==='client'||t.worker==='worker')).length,reviewList=reviews.map(r=>\`<article class="card"><b class="stars">\${ratingStars(r.rating)}</b><p>\${safe(r.comment)}</p><small>Completed-task review</small></article>\`).join('')||'<p class="intro">No reviews yet.</p>';const accountTab=\`<section class="settings-section"><div class="settings-title"><div><div class="ey">ACCOUNT DETAILS</div><h2>Profile settings</h2></div><span class="small">Private fields stay private</span></div><form class="form" onsubmit="saveAccount(event)"><div class="setting-row"><label>Full name</label><input name="name" autocomplete="name" required value="\${safe(account.name||'')}"></div><div class="setting-row"><label>Username</label><input name="username" autocomplete="username" required value="\${safe(account.username||'')}" placeholder="e.g. michael_work"></div><div class="setting-row"><label>Login email</label><input name="email" type="email" autocomplete="email" required value="\${safe(auth.email)}"></div><div class="setting-row"><label>Phone number</label><input name="phone" type="tel" autocomplete="tel" value="\${safe(account.phone||'')}"></div><div class="setting-row"><label>Account type</label><select name="role"><option value="client" \${role==='client'?'selected':''}>Client</option><option value="worker" \${role==='worker'?'selected':''}>Worker</option><option value="dual" \${role==='dual'?'selected':''}>Dual account</option></select></div><div class="setting-row"><label>Public location</label><input name="location" value="\${safe(profileLocation(account))}" placeholder="Lagos, Nigeria"></div><div class="setting-row"><label>Languages</label><input name="languages" value="\${safe(profileLanguages(account))}" placeholder="English, Yoruba, Igbo"></div><div class="setting-row"><label>About</label><textarea name="about" placeholder="Tell people about your work and experience.">\${safe(profileAbout(account))}</textarea></div><button class="profile-save">Save changes</button></form></section>\`;return \`<div class="account-profile"><div class="ey">YOUR PROFILE · \${role==='dual'?'DUAL ACCOUNT':role==='client'?'CLIENT ACCOUNT':'WORKER ACCOUNT'}</div><section class="profile-sheet"><div class="account-cover"></div><div class="profile-head"><div class="profile-avatar-card" onclick="showProfilePhoto()">\${accountPhoto(account)}</div><div><div class="profile-name-row"><h1>\${safe(account.name||'Erranus member')}</h1><span class="stars">\${ratingStars(account.rating??0)}</span></div><p class="private-email">@\${safe(account.username||'choose_username')} · \${safe(auth.email)} · Visible only to you</p><label class="profile-photo-button">Change photo<input type="file" accept="image/*" onchange="previewProfilePhoto(this)"></label></div></div><div class="profile-metrics"><div><b>\${posted}</b><span class="small">Tasks posted</span></div><div><b>\${done}</b><span class="small">Completed</span></div><div><b>\${ratingStars(account.rating??0)}</b><span class="small">Your rating</span></div></div></section><div class="profile-tabs"><button class="\${profilePane==='account'?'active':''}" onclick="profilePane='account';render()">Account</button><button class="\${profilePane==='reviews'?'active':''}" onclick="profilePane='reviews';render()">Reviews</button></div>\${profilePane==='account'?accountTab:\`<section class="settings-section"><div class="ey">REVIEWS</div><h2>Task reviews</h2>\${reviewList}</section>\`}</div>\`;}
${profileOverride}
(async()=>{localStorage.removeItem('erranusTasks');const noteText=document.querySelector('.auth-note');if(noteText)noteText.textContent='Your account uses secure Supabase sign-in, verified email and password reset. No real payments are processed yet.';const {data:{session}}=await sb.auth.getSession();sessionStorage.removeItem('erranusAccount');localStorage.removeItem('erranusSession');if(session){if(passwordRecoveryReturn){auth=null;$('#appLoader').hidden=true;$('#accountTools').innerHTML='';$('#landing').hidden=false;$('.shell').hidden=true;showRecoveryPassword();}else {await useRemoteSession(session.user);if(emailConfirmationReturn)dbStatus('Email confirmed successfully. Welcome to Erranus.');}}else {auth=null;$('#appLoader').hidden=true;$('#landing').hidden=false;$('.shell').hidden=true;render();}})();
</script>`;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('PRIME TECHNOLOGIES INC')) {
    html = html.includes(clientScript)
      ? html.replace(clientScript, permanentFooter + clientScript)
      : html.replace('</body>', permanentFooter + '</body>');
  }
  if (html.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js@2')) {
    html = html.replace(/<script>\n\/\/ Supabase uses a publishable browser key[\s\S]*?<\/script><\/body>/, backend + '</body>');
    fs.writeFileSync(file, html);
  } else {
    html = html.replace('<script>\r\nconst seed=', clientScript + '<script>\r\nconst seed=');
    html = html.replace('<script>\nconst seed=', clientScript + '<script>\nconst seed=');
    html = html.replace('</script></body></html>', '</script>' + backend + '</body></html>');
    fs.writeFileSync(file, html);
  }
}
