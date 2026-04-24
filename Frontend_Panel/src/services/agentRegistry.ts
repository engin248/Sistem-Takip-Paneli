// ============================================================
// AGENT REGISTRY — AJAN ENVANTERİ
// ============================================================

export const agentRegistry = {
    getById: (id: string) => {
        return {
            id,
            kod_adi: 'TEST-AJAN',
            rol: 'OPERATÖR',
            beceri_listesi: ['test']
        };
    },
    getAll: () => []
};

export const getAgentRegistry = () => agentRegistry;
