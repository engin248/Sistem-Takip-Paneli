const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://tesxmqhkegotxenoljzl.supabase.co";
const SUPABASE_KEY = "sb_publishable_FYhWLJHf1XdutwfYFnaZhQ_l9gbc8Nm";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkStatus() {
  console.log('--- STP v2.0 DENETİM BAŞLATILDI ---');
  
  // 1. Bekleyen Kapılar (Pipeline Checkpoints)
  const { data: checkpoints, error: cpError } = await supabase
    .from('pipeline_checkpoints')
    .select('*')
    .eq('status', 'PENDING');
    
  if (cpError) {
    console.error('Checkpoints hatası:', cpError.message);
  } else {
    console.log(`Bekleyen Onay Kapısı: ${checkpoints ? checkpoints.length : 0}`);
    if (checkpoints) {
      checkpoints.forEach(cp => {
        console.log(`- [${cp.gate_id}] CommandId: ${cp.command_id} | Oluşturulma: ${cp.created_at}`);
        if (cp.gate_id === 'G2_PLAN') {
          console.log(`  İş Planı: ${JSON.stringify(cp.plan)}`);
        }
      });
    }
  }

  // 2. Aktif Komutlar
  const { data: commands, error: cmdError } = await supabase
    .from('commands')
    .select('*')
    .in('status', ['received', 'analyzing', 'detecting', 'proving', 'executing'])
    .order('created_at', { ascending: false });

  if (cmdError) {
    console.error('Commands hatası:', cmdError.message);
  } else {
    console.log(`Aktif İşlem Sayısı: ${commands ? commands.length : 0}`);
    if (commands) {
      commands.forEach(cmd => {
        console.log(`- ID: ${cmd.id} | Status: ${cmd.status} | Input: ${cmd.raw_text.substring(0, 50)}...`);
      });
    }
  }
}

checkStatus();
