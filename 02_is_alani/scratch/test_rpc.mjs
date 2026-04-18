import { createClient } from '@supabase/supabase-js';

const url = 'https://tesxmqhkegotxenoljzl.supabase.co';
const anonKey = 'sb_publishable_FYhWLJHf1XdutwfYFnaZhQ_l9gbc8Nm';

const sb = createClient(url, anonKey);

async function testRpc() {
  console.log('Testing RPC exec_sql...');
  const { data, error } = await sb.rpc('exec_sql', { 
    sql_query: "SELECT current_user, session_user;" 
  });
  
  if (error) {
    console.error('RPC Error:', error);
    // Try different parameter name
    const { data: d2, error: e2 } = await sb.rpc('exec_sql', { 
        query: "SELECT 1" 
    });
    if (e2) {
        console.error('RPC Error (alt param):', e2);
    } else {
        console.log('RPC Success (alt param):', d2);
    }
  } else {
    console.log('RPC Success:', data);
  }
}

testRpc();
