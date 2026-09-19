const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
test('application entry points exist', () => {
  ['server.js', 'public/index.html', 'public/app.js', 'public/style.css'].forEach(file => assert.ok(fs.existsSync(file), file));
});
