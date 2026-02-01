const fs = require('fs');
const path = 'c:/Users/52753/OneDrive/Documents/proyecto osel/public/admin.html';
let content = fs.readFileSync(path, 'utf8');

// Fix deleteProduct
const dpStart = content.indexOf('async function deleteProduct(id) {');
const dpEnd = content.indexOf('function editProduct(id) {');
if (dpStart !== -1 && dpEnd !== -1) {
    const newDp = `async function deleteProduct(id) {
            if (!confirm('¿Eliminar definitivamente este producto?')) return;
            try {
                const product = state.products.find(p => String(p.id) === String(id) || String(p._id) === String(id));
                const serverId = product?.mongodb_id || product?._id || (String(id).length === 24 ? id : null);
                
                if (serverId) {
                    const userData = JSON.parse(localStorage.getItem('osel_user'));
                    const controller = new AbortController();
                    setTimeout(() => controller.abort(), 2000);
                    await fetch(\`/api/products/\${serverId}\`, {
                        method: 'DELETE',
                        headers: { 'Authorization': \`Bearer \${userData?.token}\` },
                        signal: controller.signal
                    }).catch(() => {});
                }
            } catch (err) {}

            state.products = state.products.filter(p => 
                String(p.id) !== String(id) && String(p._id) !== String(id) && String(p.mongodb_id) !== String(id)
            );
            localStorage.setItem('osel_products', JSON.stringify(state.products));
            showToast('Producto eliminado');
            renderInventory();
            updateStats();
        }

        `;
    content = content.substring(0, dpStart) + newDp + content.substring(dpEnd);
}

// Fix deleteReward
const drStart = content.indexOf('async function deleteReward(id) {');
const drEnd = content.indexOf('function editReward(id) {');
if (drStart !== -1 && drEnd !== -1) {
    const newDr = `async function deleteReward(id) {
            if (!confirm('¿Eliminar esta recompensa?')) return;
            try {
                if (String(id).length === 24) {
                    const controller = new AbortController();
                    setTimeout(() => controller.abort(), 2000);
                    await fetch(\`/api/products/\${id}\`, { method: 'DELETE', signal: controller.signal }).catch(() => {});
                }
            } catch (err) {}
            state.products = state.products.filter(p => 
                String(p.id) !== String(id) && String(p._id) !== String(id)
            );
            localStorage.setItem('osel_products', JSON.stringify(state.products));
            showToast('Recompensa eliminada');
            renderRewards();
            updateStats();
        }

        `;
    content = content.substring(0, drStart) + newDr + content.substring(drEnd);
}

fs.writeFileSync(path, content, 'utf8');
console.log("Resilient delete functions applied");
