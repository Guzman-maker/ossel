const fs = require('fs');
const path = 'c:/Users/52753/OneDrive/Documents/proyecto osel/public/admin.html';

let content = fs.readFileSync(path, 'utf8');

const startMarker = 'async function deleteOrder(id) {';
const endMarker = 'function renderActivity() {';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const newFunc = `async function deleteOrder(id) {
            if (!confirm('¿Eliminar definitivamente este pedido?')) return;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                await fetch(\`/api/orders/\${id}\`, { method: 'DELETE', signal: controller.signal }).catch(() => {});
                clearTimeout(timeoutId);
            } catch (err) {}
            
            const localOrders = JSON.parse(localStorage.getItem('osel_orders')) || [];
            const filtered = localOrders.filter(o => {
                const oid = String(o._id || o.id_custom || o.id);
                return oid !== String(id);
            });
            localStorage.setItem('osel_orders', JSON.stringify(filtered));
            renderOrders();
            renderInventory();
            updateStats();
            showToast('Pedido borrado');
        }

        `;
    const newContent = content.substring(0, startIdx) + newFunc + content.substring(endIdx);
    fs.writeFileSync(path, newContent, 'utf8');
    console.log("Successfully updated deleteOrder with Node.js");
} else {
    console.log("Markers not found", { startIdx, endIdx });
}
