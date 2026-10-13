const path = require('path');
module.exports = ({ env }) => ({ connection: { client: 'sqlite', connection: { filename: path.resolve(process.cwd(), env('DATABASE_FILENAME', '.tmp/data.db')) }, useNullAsDefault: true } });
