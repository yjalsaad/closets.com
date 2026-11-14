/* Pickable registry (pure; works with any objects that have `.parent` and `.userData`, so it is unit-tested without WebGL).
 * Every interactive part (a drawer, a door, a sliding leaf, the LED switch ...) registers:
 *   { id, product, kind, label: {en, ar}, hit: [meshes to raycast], order }
 * Each hit mesh is tagged with userData.pickId so a raycast result resolves to a part by climbing parents. */
export function createRegistry() {
  const parts = new Map(); const byProduct = new Map();
  let hoverId = null, focusId = null;
  const r = {
    register(part) {
      if (!part || !part.id || !part.product) throw new Error('registry: part needs id and product');
      if (parts.has(part.id)) throw new Error('registry: duplicate part ' + part.id);
      const entry = { kind: 'drawer', label: { en: part.id, ar: part.id }, hit: [], ...part };
      for (const m of entry.hit) { m.userData = m.userData || {}; m.userData.pickId = entry.id; }
      parts.set(entry.id, entry);
      if (!byProduct.has(entry.product)) byProduct.set(entry.product, []);
      byProduct.get(entry.product).push(entry.id);
      return entry;
    },
    get: (id) => parts.get(id) || null,
    ids: () => [...parts.keys()],
    forProduct: (product) => (byProduct.get(product) || []).map((id) => parts.get(id)),
    /** all hit meshes of one product (or all products) as a flat array, for Raycaster.intersectObjects */
    hitMeshes(product) { const out = []; for (const e of (product ? r.forProduct(product) : parts.values())) out.push(...e.hit); return out; },
    /** resolve a scene object (a raycast hit's `.object`) to the part id it belongs to */
    resolve(obj) { for (let o = obj; o; o = o.parent) if (o.userData && o.userData.pickId && parts.has(o.userData.pickId)) return o.userData.pickId; return null; },
    /** first usable hit of a raycast result list ([{object, distance}]), within `reach` metres; returns {id, distance} or null */
    pick(hits, reach = Infinity, product = null) {
      for (const h of hits || []) {
        if (h.distance > reach) return null;
        const id = r.resolve(h.object); if (!id) continue;
        if (product && parts.get(id).product !== product) continue;
        return { id, distance: h.distance };
      }
      return null;
    },
    setHover(id) { const next = id && parts.has(id) ? id : null; if (next === hoverId) return false; hoverId = next; return true; },
    get hover() { return hoverId; },
    setFocus(id) { const next = id && parts.has(id) ? id : null; if (next === focusId) return false; focusId = next; return true; },
    get focus() { return focusId; },
    /** keyboard traversal inside one product: wraps; returns the next id (or the first when there is no current one) */
    step(product, currentId, dir = 1) {
      const list = (byProduct.get(product) || []); if (!list.length) return null;
      const i = list.indexOf(currentId); if (i < 0) return dir >= 0 ? list[0] : list[list.length - 1];
      return list[(i + dir + list.length) % list.length];
    },
    clear() { parts.clear(); byProduct.clear(); hoverId = focusId = null; },
  };
  return r;
}
