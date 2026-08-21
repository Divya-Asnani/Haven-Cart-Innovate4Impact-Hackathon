const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const SUPABASE_URL = env['SUPABASE_URL'];
const SUPABASE_KEY = env['SUPABASE_KEY'];

async function run() {
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    };
    
    // Check roles
    console.log("--- roles ---");
    let res = await fetch(`${SUPABASE_URL}/rest/v1/roles?limit=1`, { headers });
    console.log(await res.text());
    
    // Check user_roles
    console.log("--- user_roles ---");
    res = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?limit=1`, { headers });
    console.log(await res.text());
    
    // Check responder_public_keys
    console.log("--- responder_public_keys ---");
    res = await fetch(`${SUPABASE_URL}/rest/v1/responder_public_keys?limit=1`, { headers });
    console.log(await res.text());
}
run();
