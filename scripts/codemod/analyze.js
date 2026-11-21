// Analyse src/App.js top-level graph. usage: node analyze.js <App.js> -> prints stats
const parser = require(process.cwd() + '/node_modules/@babel/parser');
const traverse = require(process.cwd() + '/node_modules/@babel/traverse').default;
const fs = require('fs');
const file = process.env.APPJS || 'src/App.js';
const src = fs.readFileSync(file, 'utf8');
const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });
const body = ast.program.body;
// units
const units = body.map((n, i) => {
  const u = { i, node: n, names: [], kind: n.type, isImport: n.type === 'ImportDeclaration', refs: new Set(), refNames: new Set(), assigns: new Set() };
  if (n.type === 'ImportDeclaration') n.specifiers.forEach(s => u.names.push(s.local.name));
  else if (n.type === 'VariableDeclaration') n.declarations.forEach(d => { const ids = []; (function c(p){ if(p.type==='Identifier')ids.push(p.name); else if(p.type==='ObjectPattern')p.properties.forEach(x=>c(x.value||x.argument)); else if(p.type==='ArrayPattern')p.elements.forEach(x=>x&&c(x)); else if(p.type==='AssignmentPattern')c(p.left); else if(p.type==='RestElement')c(p.argument);})(d.id); u.names.push(...ids); });
  else if (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') u.names.push(n.id.name);
  else if (n.type === 'ExportDefaultDeclaration' && n.declaration.id) u.names.push(n.declaration.id.name);
  else if (n.type === 'ExportNamedDeclaration' && n.declaration) { /* not expected */ }
  return u;
});
const byName = new Map(); units.forEach(u => u.names.forEach(nm => byName.set(nm, u)));
const nodeToUnit = new Map(); units.forEach(u => nodeToUnit.set(u.node, u));
traverse(ast, {
  Program(path) {
    const pscope = path.scope;
    path.traverse({
      Identifier(p) { visit(p, p.node.name); },
      JSXIdentifier(p) {
        // only component refs / member roots: <Foo>, <Foo.Bar>; skip lowercase tags and attr names
        const par = p.parent;
        if (par.type === 'JSXAttribute') return;
        if (par.type === 'JSXMemberExpression' && par.property === p.node) return;
        if (par.type === 'JSXNamespacedName') return;
        if (/^[a-z]/.test(p.node.name) && par.type !== 'JSXMemberExpression') return;
        visit(p, p.node.name);
      },
    });
    function visit(p, name) {
      if (p.isIdentifier()) { if (!p.isReferencedIdentifier() && !p.isBindingIdentifier()) { /* e.g. property key */ } }
      const b = p.scope.getBinding(name);
      if (!b || b.scope !== pscope) return;
      if (p.isIdentifier() && !p.isReferencedIdentifier()) {
        // assignment target?
        if (p.parentPath.isAssignmentExpression({ left: p.node }) || p.parentPath.isUpdateExpression()) { /* handled below */ } else return;
      }
      let top = p; while (top.parentPath && top.parentPath.parentPath) top = top.parentPath;
      const u = nodeToUnit.get(top.node); if (!u) return;
      const decl = byName.get(name); if (!decl || decl === u) return;
      u.refs.add(decl.i); u.refNames.add(name);
      if (p.parentPath.isAssignmentExpression({ left: p.node }) || p.parentPath.isUpdateExpression()) u.assigns.add(name);
    }
  },
});
module.exports = { src, ast, units, byName };
if (require.main === module) {
  const asg = units.filter(u => u.assigns.size).map(u => u.names.join(',') + ' assigns ' + [...u.assigns]);
  console.log('units', units.length, 'assign-to-toplevel:', asg);
}
