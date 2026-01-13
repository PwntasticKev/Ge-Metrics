const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.dependencies['hoist-non-react-statics']) {
  pkg.dependencies['hoist-non-react-statics'] = '^3.3.2';
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('Added hoist-non-react-statics to dependencies');
