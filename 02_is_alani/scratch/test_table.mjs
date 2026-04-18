import { createClient } from '@supabase/supabase-js';

const url = 'https://tesxmqhkegotxenoljzl.supabase.co';
const anonKey = 'sb_publishable_FYhWLJHf1XdutwfYFnaZhQ_l9gbc8Nm';

const sb = createClient(url, anonKey);

async function checkTable() {
  console.log('Checking if pipeline_checkpoints exists...');
  const { data, error } = await sb.from('pipeline_checkpoints').select('id').limit(1);
  
  if (error) {
    console.error('Table Error:', error.message);
  } else {
    console.log('Table exists! Found records:', data.length);
  }
}

checkTable();
