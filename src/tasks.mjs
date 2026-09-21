export const agreementVersion = '1';
export const seeds = [
  {id:'1',title:'Help pack orders at a small shop',category:'Shop support',area:'Yaba, Lagos',amount:6500,duration:'3 hours',description:'Pack and label 30 clothing orders. All packing materials are provided.',owner:'customer-1',status:'Open'},
  {id:'2',title:'Clean a two-bedroom apartment',category:'Cleaning',area:'Ikeja, Lagos',amount:12000,duration:'4 hours',description:'Sweep, mop and clean the kitchen and bathrooms. Cleaning supplies are provided.',owner:'customer-2',status:'Open'},
  {id:'3',title:'Help arrange chairs for an event',category:'Events',area:'Surulere, Lagos',amount:8000,duration:'2 hours',description:'Set up 60 chairs and 10 tables with the event team. No transport expenses required.',owner:'customer-3',status:'Open'}
];
export function acceptTask(task, worker, signature, consent, timestamp) {
  if(task.status !== 'Open') throw new Error('This task is no longer available.');
  if(task.owner === worker) throw new Error('You cannot accept your own task.');
  if(!signature.trim() || !consent) throw new Error('Sign the agreement and consent to location sharing.');
  return {...task,status:'Accepted',worker,agreement:{version:agreementVersion,signature:signature.trim(),amount:task.amount,scope:task.description,signedAt:timestamp}};
}
export function transition(task, actor, next) {
  const allowed = (actor === task.worker && ((task.status === 'Accepted' && next === 'In progress') || (task.status === 'In progress' && next === 'Completion requested') || (['Accepted','In progress'].includes(task.status) && next === 'Cancelled'))) || (actor === task.owner && task.status === 'Completion requested' && next === 'Completed');
  if(!allowed) throw new Error('This action is not available.');
  return {...task,status:next};
}
export function canReveal(task, viewer) { return viewer === task.owner || (viewer === task.worker && !!task.agreement && ['Accepted','In progress','Completion requested','Completed'].includes(task.status)); }
export function tracks(task) { return !!task && ['Accepted','In progress'].includes(task.status); }
