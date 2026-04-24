
const fs = require('fs');
const path = require('path');

const directory = 'c:/Users/Esisya/Desktop/Sistem-Takip-Paneli';

const replacements = [
    {regex: /denetim_protokolu/g, replace: 'denetim_protokolu'},
    {regex: /DENETÇİ PROTOKOL\u00dc/g, replace: 'DENET\u0130M PROTOKOL\u00dc'},
    {regex: /DENETIM_ANAYASASI/g, replace: 'DENETIM_ANAYASASI'},
    {regex: /denetimSistemi/g, replace: 'denetimSistemi'},
    {regex: /denetimCevabi_val/g, replace: 'denetimCevabi_val'},
    {regex: /denetimKriterleriniMetneCevir/g, replace: 'denetimKriterleriniMetneCevir'},
    {regex: /aiDenetim/g, replace: 'aiDenetim'},
    {regex: /DENETÇİ/g, replace: 'DENET\u00c7\u0130'},
    {regex: /Z\u0131nd\u0131k/g, replace: 'Denet\u00e7i'},
    {regex: /z\u0131nd\u0131k/g, replace: 'denet\u00e7i'},
    {regex: /denetim/g, replace: 'denetim'},
    {regex: /gecici_hafiza/g, replace: 'gecici_hafiza'},
    {regex: /GECICI_LOG_DOSYASI/g, replace: 'GECICI_LOG_DOSYASI'},
    {regex: /logGeciciHafiza/g, replace: 'logGeciciHafiza'},
    {regex: /Geçici Bellek Ajanı/g, replace: 'Ge\u00e7ici Bellek Ajan\u0131'},
    {regex: /Geçici_Bellek/g, replace: 'Ge\u00e7ici_Bellek'},
    {regex: /GECICI_BELLEK/g, replace: 'GECICI_BELLEK'},
    {regex: /gecici_bellek/g, replace: 'gecici_bellek'},
    {regex: /Z\u0131nd\u0131k_raporu/g, replace: 'denetci_raporu'}
];

function getAllFiles(dirPath, arrayOfFiles) {
    let files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (file === 'node_modules' || file === '.git' || file === '.next' || file === '.agent_audit' || file === '.agent_memory') return;
        let fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            if(fullPath.endsWith('.js') || fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.md')) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles(directory);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let hasChanged = false;

    replacements.forEach(rep => {
        if(content.match(rep.regex)) {
            content = content.replace(rep.regex, rep.replace);
            hasChanged = true;
        }
    });

    if (hasChanged) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Modified: ' + file);
    }
});
