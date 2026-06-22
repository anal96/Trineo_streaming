import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('\n==================================================================');
console.log('                 GENERATE VAPID KEYS FOR PWA PUSH                ');
console.log('==================================================================\n');
console.log('Add the following variables to your server/.env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('\n==================================================================\n');
