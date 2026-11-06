'use strict';
const crypto=require('node:crypto');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
function consume(record,limit,windowMs,now) {
 const next=!record||record.until<=now?{count:0,until:now+windowMs}:{...record};
 if(next.count>=limit)throw Object.assign(new Error('rate_limited'),{code:'rate_limited',status:429});
 next.count++;return next;
}
const invitationLimits=(actor,target)=>[
 {key:'invite-actor:'+actor,limit:6,windowMs:60000},
 {key:'invite-target:'+target,limit:6,windowMs:60000},
];
const RETENTION_MS=30*24*60*60*1000;
module.exports={digest,consume,invitationLimits,RETENTION_MS};
