/* [WEB-STUDIO 2026-10-31] Website shim of Bonsai's neoKitchen/matInventory.js: customers never see the factory inventory.
 * Same exports; the "Production materials" panel reads as "no inventory" and can never create an item. */
export const resetInventoryCache = () => {};
export function loadInventory() { return Promise.resolve({ status: 'absent', items: [], at: Date.now() }); }
export const canCreateInventory = () => false;
export function newItemPayload(name) { return { name: String(name || '').trim(), item_type: 'material' }; }
export async function createInventoryItem() { return { ok: false, error: 'not available' }; }
