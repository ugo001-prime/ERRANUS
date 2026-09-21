const fs = require('fs');

const files = ['index.html', 'frontend-preview.html'];
const clientScript = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
const backend = `<script>
// Supabase uses a publishable browser key. Database access is protected by RLS policies.
const sb = window.supabase.createClient('https://hfxlpsumohqhjsfjtfkd.supabase.co', 'sb_publishable_cKBepyjHKEi6E5Wh6MYzIg_SnPmLdKs');
const emailConfirmationReturn = /access_token|type=signup|code=/.test(location.hash + location.search);
const dbStatus = message => note(message);
const statusLabel = value => ({open:'Open',accepted:'Accepted',in_progress:'In progress',completion_requested:'Completion requested',completed:'Completed',cancelled:'Cancelled'}[value] || value);
async function loadRemoteTasks(){
  if(!auth?.id) return;
  const {data,error}=await sb.from('tasks').select('*').order('created_at',{ascending:false});
  if(error){console.error(error);return;}
  tasks=data.map(t=>({id:t.id,title:t.title,category:t.category,area:t.public_area,amount:Number(t.amount),duration:t.duration,description:t.description,owner:t.client_id===auth.id?'client':'other',worker:t.worker_id===auth.id?'worker':t.worker_id?'other':undefined,status:statusLabel(t.status),signature:t.worker_signature}));
  render();
}
async function useRemoteSession(user){
  const [{data:profileResult},{data:privateResult}]=await Promise.all([
    sb.from('profiles').select('*').eq('id',user.id).single(),
    sb.from('private_profiles').select('*').eq('id',user.id).single()
  ]);
  const profile=profileResult || {};
  const accounts=JSON.parse(localStorage.erranusAccounts||'{}');
  accounts[user.email]={...(accounts[user.email]||{}),name:profile.full_name||user.user_metadata?.full_name||'Erranus member',phone:privateResult?.phone_number||user.user_metadata?.phone_number||'',role:profile.account_type||user.user_metadata?.account_type||'dual',rating:Number(profile.rating||0),completed:Number(profile.completed_task_count||0)};
  localStorage.erranusAccounts=JSON.stringify(accounts);
  auth={id:user.id,email:user.email,name:accounts[user.email].name,role:accounts[user.email].role,isAdmin:false};
  role=auth.role;
  sessionStorage.erranusAccount=JSON.stringify(auth);
  $('#auth').className='auth'; $('#landing').hidden=true; $('.shell').hidden=false; tab='dashboard';
  await loadRemoteTasks(); render();
}
async function authenticate(e){
  e.preventDefault(); const f=new FormData(e.target),email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('password')||'');
  if(authView==='reset'){
    if(!email) return dbStatus('Enter your email address.');
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin});
    return dbStatus(error?error.message:'Password reset email sent. Check your inbox.');
  }
  if(authView==='signup'){
    if(password!==String(f.get('confirmPassword')||'')) return dbStatus('Passwords do not match.');
    const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:String(f.get('name')||'').trim(),phone_number:String(f.get('phone')||'').trim(),account_type:String(f.get('role')||'worker')}}});
    if(error) return dbStatus(error.message);
    e.target.reset();
    if(data.session) await useRemoteSession(data.user); else {authMode('signin');dbStatus('Account created. Check your email to confirm it, then log in.');}
    return;
  }
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error) return dbStatus(error.message);
  localStorage.erranusRememberedEmail=email;
  await useRemoteSession(data.user); dbStatus('You are logged in.');
}
async function signOut(){await sb.auth.signOut();sessionStorage.removeItem('erranusAccount');localStorage.removeItem('erranusSession');auth=null;$('#landing').hidden=false;$('.shell').hidden=true;$('#accountTools').innerHTML='';dbStatus('You are signed out.');}
async function savePassword(e){e.preventDefault();const f=new FormData(e.target),next=String(f.get('next')||'');if(next!==String(f.get('confirm')||''))return dbStatus('New passwords do not match.');const {error}=await sb.auth.updateUser({password:next});if(error)return dbStatus(error.message);closeModal();dbStatus('Password updated.');}
async function saveAccount(e){e.preventDefault();const f=new FormData(e.target),name=String(f.get('name')||'').trim(),phone=String(f.get('phone')||'').trim(),accountType=String(f.get('role')||'worker'),about=String(f.get('about')||'').trim(),area=String(f.get('location')||'').trim(),languages=String(f.get('languages')||'').split(',').map(x=>x.trim()).filter(Boolean),nextEmail=String(f.get('email')||'').trim().toLowerCase();const [{error:profileError},{error:privateError}]=await Promise.all([sb.from('profiles').update({full_name:name,account_type:accountType,about,public_area:area,languages,updated_at:new Date().toISOString()}).eq('id',auth.id),sb.from('private_profiles').update({phone_number:phone}).eq('id',auth.id)]);if(profileError||privateError)return dbStatus((profileError||privateError).message);const accounts=JSON.parse(localStorage.erranusAccounts||'{}');accounts[auth.email]={...(accounts[auth.email]||{}),name,phone,role:accountType,about,location:area,languages:languages.join(', ')};localStorage.erranusAccounts=JSON.stringify(accounts);auth.name=name;auth.role=accountType;role=accountType;sessionStorage.erranusAccount=JSON.stringify(auth);if(nextEmail&&nextEmail!==auth.email){const {error}=await sb.auth.updateUser({email:nextEmail});if(error)return dbStatus(error.message);dbStatus('Profile saved. Confirm the email sent to your new address before using it to log in.');}else dbStatus('Profile saved.');render();}
async function postTask(e){e.preventDefault();const f=new FormData(e.target);const {error}=await sb.from('tasks').insert({client_id:auth.id,title:String(f.get('title')).trim(),category:String(f.get('category')).trim(),public_area:String(f.get('area')).trim(),amount:Number(f.get('amount')),duration:String(f.get('duration')).trim(),description:String(f.get('description')).trim()});if(error)return dbStatus(error.message);tab='my';await loadRemoteTasks();dbStatus('Task posted for Erranus users.');}
async function accept(e){e.preventDefault();const {error}=await sb.rpc('accept_task',{p_task_id:current.id,p_signature:String(new FormData(e.target).get('name')).trim()});if(error)return dbStatus(error.message);await loadRemoteTasks();dbStatus('Agreement signed. Details unlocked.');}
async function status(label){const map={'In progress':'in_progress','Completion requested':'completion_requested','Completed':'completed'};const {error}=await sb.rpc('update_task_status',{p_task_id:current.id,p_status:map[label]});if(error)return dbStatus(error.message);await loadRemoteTasks();dbStatus('Task updated: '+label);}
function authMode(m){authView=m;const landing=m==='landing',signup=m==='signup',reset=m==='reset';$('#authChoices').hidden=!landing;$('#authForm').hidden=landing;if(landing){$('#authTitle').textContent='Welcome to Erranus';$('#authText').textContent='Choose how you want to continue.';$('#authSwitch').hidden=true;return;}$('#authSwitch').hidden=false;$('#nameField').hidden=!signup;$('#nameField').style.display=signup?'grid':'none';$('#nameField input').required=signup;$('#emailField').hidden=false;$('#emailField input').required=true;$('#phoneField').hidden=!signup;$('#phoneField').style.display=signup?'grid':'none';$('#phoneField input').required=signup;$('#roleField').hidden=!signup;$('#roleField').style.display=signup?'grid':'none';$('#roleField select').required=signup;$('#passwordLabel').parentElement.hidden=reset;$('#confirmPasswordField').hidden=!signup;$('#confirmPasswordField input').required=signup;$('#rememberField').hidden=true;$('#passwordLabel').parentElement.querySelector('input').required=!reset;$('#authTitle').textContent=signup?'Create your account':reset?'Forgotten password':'Log in';$('#authText').textContent=signup?'Enter your full name, email, phone number and password.':reset?'Enter your email address to receive a secure password-reset link.':'Enter your email and password to access your account.';$('#authSubmit').textContent=signup?'Sign up':reset?'Send reset email':'Log in';$('#authSwitch').innerHTML=signup?\`Already have an account? <a href="#" onclick="authMode('signin');return false">Log in</a>\`:reset?\`Back to <a href="#" onclick="authMode('signin');return false">log in</a>\`:\`New user? <a href="#" onclick="authMode('signup');return false">Sign up</a> · <a href="#" onclick="authMode('reset');return false">Forgotten password?</a>\`;}
(async()=>{const noteText=document.querySelector('.auth-note');if(noteText)noteText.textContent='Your account uses secure Supabase sign-in, verified email and password reset. No real payments are processed yet.';const {data:{session}}=await sb.auth.getSession();sessionStorage.removeItem('erranusAccount');localStorage.removeItem('erranusSession');if(session){await useRemoteSession(session.user);if(emailConfirmationReturn)dbStatus('Email confirmed successfully. Welcome to Erranus.');}else {auth=null;$('#landing').hidden=false;$('.shell').hidden=true;render();}})();
</script>`;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
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
