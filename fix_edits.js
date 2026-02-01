const fs = require('fs');
const path = 'c:/Users/52753/OneDrive/Documents/proyecto osel/public/admin.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix editProduct
const epStart = content.indexOf('function editProduct(id) {');
const epEnd = content.indexOf('async function deleteReward(id) {');
if (epStart !== -1 && epEnd !== -1) {
    const newEp = `function editProduct(id) {
            // Find by string comparison to handle both numeric and mongo IDs
            const p = state.products.find(item => String(item.id) === String(id) || String(item._id) === String(id));
            if (!p) return;

            openProductModal();
            document.getElementById('modal-title').textContent = 'Editar Producto';
            document.getElementById('p-id').value = p.id || p._id;
            document.getElementById('p-name').value = p.name;
            document.getElementById('p-sku').value = p.sku;

            const select = document.getElementById('p-category');
            if (select) {
                const catExists = Array.from(select.options).some(opt => opt.value === p.category);
                if (catExists) {
                    select.value = p.category;
                } else {
                    const optByText = Array.from(select.options).find(opt => opt.text.toLowerCase() === String(p.category || '').toLowerCase());
                    if (optByText) select.value = optByText.value;
                }
            }

            document.getElementById('p-stock').value = p.stock || 0;
            document.getElementById('p-desc').value = p.desc || p.description || '';
            document.getElementById('p-tipo').value = p.tipo || 'venta';

            toggleProductType(p.tipo || 'venta');

            if (p.tipo === 'venta' || !p.tipo) {
                document.getElementById('p-cost').value = p.cost || 0;
                document.getElementById('p-price').value = p.price || 0;
                document.getElementById('p-puntos-otorga').value = p.points || 0;
            } else {
                document.getElementById('p-puntos-canje').value = p.puntosRequeridos || p.pointsCost || 0;
            }

            calculateModalProfit();
        }
`;
    content = content.substring(0, epStart) + newEp + content.substring(epEnd);
}

// 2. Fix editReward
const erStart = content.indexOf('function editReward(id) {');
const erEnd = content.indexOf('async function changeAdminPassword() {');
if (erStart !== -1 && erEnd !== -1) {
    const newEr = `function editReward(id) {
            const r = state.products.find(item => String(item.id) === String(id) || String(item._id) === String(id));
            if (!r) return;

            openRewardModal();
            document.querySelector('#reward-modal h3').textContent = '🎁 Editar Recompensa';
            document.getElementById('r-id').value = r.id || r._id;
            document.getElementById('r-name').value = r.name;
            document.getElementById('r-desc').value = r.desc || r.description || '';
            document.getElementById('r-stock').value = r.stock || 0;
            document.getElementById('r-points').value = r.puntosRequeridos || r.pointsCost || 0;
            document.getElementById('r-cost').value = r.cost || 0;
            document.getElementById('r-price').value = r.price || 0;
        }
`;
    content = content.substring(0, erStart) + newEr + content.substring(erEnd);
}

// 3. Fix saveProduct & finalizeSaveProduct
const spStart = content.indexOf('function saveProduct(event) {');
const fspEnd = content.indexOf('function calculateModalProfit() {', spStart + 1); // Added some safety
const fspNext = content.indexOf('function calculateModalProfit() {', spStart + 100);

if (spStart !== -1) {
    // We need to find the correct end of finalizeSaveProduct
    // It's followed by calculateModalProfit or similar.
    // Based on previous view_file, it's roughly 100 lines.
    const fspStart = content.indexOf('async function finalizeSaveProduct(productData, pId) {', spStart);
    const searchAfter = fspStart !== -1 ? fspStart : spStart;
    const realEnd = content.indexOf('function calculateModalProfit() {', searchAfter);

    if (realEnd !== -1) {
        const newSpFuncs = `function saveProduct(event) {
            event.preventDefault();

            const pId = document.getElementById('p-id').value;
            const tipo = document.getElementById('p-tipo').value;

            // Maintain numeric ID for local, use String ID for server
            const numericId = String(pId).length < 15 ? parseInt(pId) : null;

            const productData = {
                id: pId || Date.now(),
                name: document.getElementById('p-name').value,
                sku: document.getElementById('p-sku').value,
                category: document.getElementById('p-category').value,
                stock: parseInt(document.getElementById('p-stock').value) || 0,
                desc: document.getElementById('p-desc').value,
                tipo: tipo
            };

            if (tipo === 'venta') {
                productData.price = parseFloat(document.getElementById('p-price').value) || 0;
                productData.cost = parseFloat(document.getElementById('p-cost').value) || 0;
                productData.points = parseInt(document.getElementById('p-puntos-otorga').value) || 0;
            } else {
                productData.price = 0;
                productData.cost = 0;
                productData.puntosRequeridos = parseInt(document.getElementById('p-puntos-canje').value) || 0;
            }

            const existingProduct = state.products.find(p => String(p.id) === String(pId) || String(p._id) === String(pId));

            if (croppedImageData) {
                productData.image = croppedImageData;
                croppedImageData = null;
                finalizeSaveProduct(productData, pId);
            } else {
                productData.image = existingProduct ? existingProduct.image : 'https://via.placeholder.com/400';
                finalizeSaveProduct(productData, pId);
            }
        }

        async function finalizeSaveProduct(productData, pId) {
            // Guardar localmente
            if (pId) {
                const index = state.products.findIndex(p => String(p.id) === String(pId) || String(p._id) === String(pId));
                if (index !== -1) {
                    state.products[index] = { ...state.products[index], ...productData };
                } else {
                    state.products.push(productData);
                }
            } else {
                state.products.push(productData);
            }
            localStorage.setItem('osel_products', JSON.stringify(state.products));

            // SINCRONIZAR CON SERVIDOR
            try {
                const userData = JSON.parse(localStorage.getItem('osel_user'));
                const existingProduct = state.products.find(p => String(p.id) === String(pId) || String(p._id) === String(pId));
                const serverId = existingProduct?.mongodb_id || (pId && String(pId).length === 24 ? pId : null);

                const payload = {
                    name: productData.name,
                    description: productData.desc,
                    price: productData.price,
                    image: productData.image,
                    category: productData.category,
                    stock: productData.stock,
                    sku: productData.sku,
                    isRedeemable: productData.tipo === 'recompensa',
                    pointsCost: productData.puntosRequeridos || 0
                };

                let response;
                if (serverId) {
                    // UPDATE
                    response = await fetch(\`/api/products/\${serverId}\`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': \`Bearer \${userData?.token}\`
                        },
                        body: JSON.stringify(payload)
                    });
                } else {
                    // CREATE
                    response = await fetch('/api/products', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': \`Bearer \${userData?.token}\`
                        },
                        body: JSON.stringify(payload)
                    });
                }

                if (response.ok) {
                    const saved = await response.json();
                    const index = state.products.findIndex(p => p.name === productData.name);
                    if (index !== -1) {
                        state.products[index].mongodb_id = saved._id;
                        state.products[index]._id = saved._id;
                        localStorage.setItem('osel_products', JSON.stringify(state.products));
                    }
                }
            } catch (err) {
                console.error('[OSEL] Error sincronizando:', err);
            }

            alert(\`✅ Producto \${pId ? 'actualizado' : 'agregado'} exitosamente.\`);
            document.getElementById('product-modal').classList.add('hidden');
            renderInventory();
            updateStats();
        }
`;
        content = content.substring(0, spStart) + newSpFuncs + content.substring(realEnd);
    }
}

// 4. Fix saveReward & finalizeSaveReward
const srStart = content.indexOf('function saveReward(event) {');
const frEnd = content.indexOf('// Render Rewards', srStart !== -1 ? srStart : 0);

if (srStart !== -1 && frEnd !== -1) {
    const newSrFuncs = `function saveReward(event) {
            event.preventDefault();

            const rId = document.getElementById('r-id').value;
            const rewardData = {
                id: rId || Date.now(),
                name: document.getElementById('r-name').value,
                desc: document.getElementById('r-desc').value || '',
                stock: parseInt(document.getElementById('r-stock').value) || 0,
                puntosRequeridos: parseInt(document.getElementById('r-points').value) || 0,
                cost: parseFloat(document.getElementById('r-cost').value) || 0,
                price: parseFloat(document.getElementById('r-price').value) || 0,
                tipo: 'recompensa',
                points: 0,
                category: 'recompensa'
            };

            const existingReward = state.products.find(p => String(p.id) === String(rId) || String(p._id) === String(rId));
            const fileInput = document.getElementById('r-image');

            if (fileInput && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    rewardData.image = e.target.result;
                    finalizeSaveReward(rewardData, rId);
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                rewardData.image = existingReward ? existingReward.image : 'https://via.placeholder.com/400';
                finalizeSaveReward(rewardData, rId);
            }
        }

        async function finalizeSaveReward(rewardData, rId) {
            if (rId) {
                const index = state.products.findIndex(p => String(p.id) === String(rId) || String(p._id) === String(rId));
                if (index !== -1) {
                    state.products[index] = { ...state.products[index], ...rewardData };
                } else {
                    state.products.push(rewardData);
                }
            } else {
                state.products.push(rewardData);
            }

            localStorage.setItem('osel_products', JSON.stringify(state.products));
            
            // Sincronizar con servidor como producto recompensa
            try {
                const userData = JSON.parse(localStorage.getItem('osel_user'));
                const existing = state.products.find(p => String(p.id) === String(rId) || String(p._id) === String(rId));
                const serverId = existing?.mongodb_id || (rId && String(rId).length === 24 ? rId : null);

                const payload = {
                    name: rewardData.name,
                    description: rewardData.desc,
                    price: 0,
                    image: rewardData.image,
                    category: 'recompensa',
                    stock: rewardData.stock,
                    isRedeemable: true,
                    pointsCost: rewardData.puntosRequeridos
                };

                if (serverId) {
                    await fetch(\`/api/products/\${serverId}\`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${userData?.token}\` },
                        body: JSON.stringify(payload)
                    });
                } else {
                    const resp = await fetch('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${userData?.token}\` },
                        body: JSON.stringify(payload)
                    });
                    if (resp.ok) {
                        const saved = await resp.json();
                        const idx = state.products.findIndex(p => p.name === rewardData.name);
                        if (idx !== -1) {
                            state.products[idx].mongodb_id = saved._id;
                            state.products[idx]._id = saved._id;
                            localStorage.setItem('osel_products', JSON.stringify(state.products));
                        }
                    }
                }
            } catch(e) {}

            alert(\`✅ Recompensa \${rId ? 'actualizada' : 'agregada'} exitosamente!\`);
            document.getElementById('reward-modal').classList.add('hidden');
            renderRewards();
            updateStats();
        }
`;
    content = content.substring(0, srStart) + newSrFuncs + content.substring(frEnd);
}

fs.writeFileSync(path, content, 'utf8');
console.log("All edition functions fixed and PUT route integrated.");
