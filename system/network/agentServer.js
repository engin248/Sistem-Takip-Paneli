/**
 * NETWORK / AGENT SERVER
 * =======================
 * PORT=3001 üzerinden 35-40 ajanlık orkestrasyon ağını yöneten
 * ana sunucu dosyası. (Dağıtık AI Merkezi Giriş Kapısı)
 */
'use strict';

const express = require('express');
const coreServer = require('../core/server');

const app = express();
app.use(express.json());

// Core API'yi Agent Sunucusuna bağla
app.use('/api/v1/orchestrator', coreServer);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`[NİZAM AĞI] Dağıtık AI Ajan Sunucusu başlatıldı.`);
    console.log(`[NİZAM AĞI] PORT: ${PORT}`);
    console.log(`[NİZAM AĞI] Durum: AKTİF (Kilit Rejimi: STRICT)`);
});
