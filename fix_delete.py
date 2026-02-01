import os

file_path = r'c:\Users\52753\OneDrive\Documents\proyecto osel\public\admin.html'
with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

start_marker = 'async function deleteOrder(id) {'
end_marker = 'function renderActivity() {'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_func = """async function deleteOrder(id) {
            if (!confirm('¿Eliminar definitivamente este pedido?')) return;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                await fetch(`/api/orders/${id}`, { method: 'DELETE', signal: controller.signal });
                clearTimeout(timeoutId);
            } catch (err) {}
            
            const localOrders = JSON.parse(localStorage.getItem('osel_orders')) || [];
            const filtered = localOrders.filter(o => 
                String(o._id) === String(id) || String(o.id) === String(id) || String(o.id_custom) === String(id) 
                ? false : true
            );
            localStorage.setItem('osel_orders', JSON.stringify(filtered));
            renderOrders();
            renderInventory();
            updateStats();
            showToast('Pedido borrado');
        }

        """
    new_content = content[:start_idx] + new_func + content[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated deleteOrder")
else:
    print(f"Markers not found: start={start_idx}, end={end_idx}")
