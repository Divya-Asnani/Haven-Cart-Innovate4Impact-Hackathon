const fs = require('fs');

// Read env vars
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const SUPABASE_URL = env['SUPABASE_URL'];
const SUPABASE_KEY = env['SUPABASE_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

async function runTests() {
    console.log("Testing live Supabase audit_logs table...");

    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    // 1. Fetch an existing case to use for foreign key
    console.log("\nFetching an existing HIGH risk case...");
    let res = await fetch(`${SUPABASE_URL}/rest/v1/safety_cases?risk_level=eq.HIGH&limit=1`, { headers });
    let cases = await res.json();
    
    if (!cases || cases.length === 0) {
        console.error("No HIGH risk cases found. Cannot test case_id foreign key.");
        process.exit(1);
    }
    
    const caseId = cases[0].id;
    // We will use a dummy actor UUID
    const actorId = '00000000-0000-0000-0000-000000000000';
    
    console.log(`Using case_id: ${caseId} and actor_id: ${actorId}`);

    // 2. Test inserting CASE_VIEWED
    console.log("\nInserting CASE_VIEWED...");
    res = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            actor_id: actorId,
            action: 'CASE_VIEWED',
            case_id: caseId,
            metadata: { notes: "Testing view" }
        })
    });
    
    if (!res.ok) {
        console.error("Failed to insert CASE_VIEWED", await res.text());
        process.exit(1);
    }
    const viewLog = await res.json();
    console.log("Success! Inserted:", viewLog[0]);

    // 3. Test inserting EVIDENCE_VIEWED
    console.log("\nInserting EVIDENCE_VIEWED...");
    res = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            actor_id: actorId,
            action: 'EVIDENCE_VIEWED',
            case_id: caseId
        })
    });
    if (res.ok) console.log("Success!");
    else console.error(await res.text());

    // 4. Test unauthorized delete (simulate REST API client trying to delete)
    // Actually our key is the service_role key so it bypasses RLS. But let's verify if there is an endpoint.
    console.log("\nVerifying data retrieved from audit_logs...");
    res = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?case_id=eq.${caseId}`, { headers: { ...headers, 'Prefer': '' } });
    const logs = await res.json();
    
    console.log(`Found ${logs.length} logs for this case.`);
    logs.forEach(l => {
        console.log(`- [${l.created_at}] ${l.action} by ${l.actor_id}`);
        // Sensitive check
        const metaStr = JSON.stringify(l.metadata || {}).toLowerCase();
        if (metaStr.includes('pin') || metaStr.includes('key') || metaStr.includes('enc')) {
            console.log("  WARNING: SENSITIVE DATA DETECTED!");
        }
    });

    console.log("\nDatabase table verification complete.");
}

runTests().catch(console.error);
