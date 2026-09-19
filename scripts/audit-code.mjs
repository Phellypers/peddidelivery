import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const walk = directory => fs.existsSync(directory)
  ? fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : extensions.includes(path.extname(file)) ? [file] : [];
  }) : [];
const files = ['src', 'server/src', 'server/tests', 'tests', 'scripts'].flatMap(walk)
  .concat(fs.readdirSync(root).filter(file => extensions.includes(path.extname(file)) && !file.startsWith('.')));
const dependencies = new Set();
const graph = new Map();
const resolve = (file, specifier) => {
  const base = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2))
    : specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier.split('?')[0]) : null;
  if (!base) return null;
  // TypeScript server imports intentionally use .js specifiers for emitted code.
  const candidates = [base, ...extensions.map(extension => base + extension),
    ...extensions.map(extension => path.join(base, 'index' + extension))];
  if (base.endsWith('.js')) candidates.push(base.slice(0, -3) + '.ts');
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
};
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const references = [];
  const visit = node => {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) specifier = node.moduleSpecifier;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require')) specifier = node.arguments[0];
    if (specifier && ts.isStringLiteral(specifier)) {
      const value = specifier.text;
      const resolved = resolve(file, value);
      if (resolved) references.push(path.resolve(resolved));
      else if (!value.startsWith('.') && !value.startsWith('@/')) dependencies.add(value.startsWith('@') ? value.split('/').slice(0, 2).join('/') : value.split('/')[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  graph.set(path.resolve(file), references);
}
const roots = files.filter(file => !file.startsWith('src' + path.sep) && !file.startsWith('src/'));
const pending = [path.resolve('src/main.jsx'), ...roots.map(file => path.resolve(file))];
const reachable = new Set();
while (pending.length) {
  const file = pending.pop();
  if (reachable.has(file)) continue;
  reachable.add(file);
  pending.push(...(graph.get(file) || []));
}
const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const preserved = new Map([
  [path.normalize('src/components/storefront/WhatsAppButton.jsx'), 'Canal preparado para a integração futura de WhatsApp.'],
]);
console.log(JSON.stringify({
  unusedSourceCandidates: files.filter(file => file.startsWith('src') && !file.endsWith('.d.ts') && !reachable.has(path.resolve(file)) && !preserved.has(path.normalize(file))),
  unusedDependencyCandidates: Object.keys(manifest.dependencies).filter(name => !dependencies.has(name)),
  preservedPreparedIntegrations: Object.fromEntries(preserved),
  note: 'Review candidates before removal. Public assets, dynamic references and prepared integrations require a manual usage check.',
}, null, 2));
