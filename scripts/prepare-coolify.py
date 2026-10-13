#!/usr/bin/env python3
"""Prepare persistent Coolify storage from a verified, restored CMS backup."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import sqlite3
import tempfile

SECRET_KEYS = [
    'APP_KEYS', 'ADMIN_JWT_SECRET', 'API_TOKEN_SALT', 'TRANSFER_TOKEN_SALT',
    'ENCRYPTION_KEY', 'JWT_SECRET', 'CMS_LOGIN_ID', 'CMS_PASS',
]
OPTIONAL_KEYS = [
    'RESEND_API_KEY', 'SMTP_FROM', 'CONTACT_NOTIFY_TO', 'SMTP_HOST', 'SMTP_PORT',
    'SMTP_USERNAME', 'SMTP_PASSWORD', 'GITHUB_TOKEN',
]

def env_lines(file):
    result = {}
    if file.exists():
        for line in file.read_text().splitlines():
            line = line.strip()
            if line.startswith('export '):
                line = line[7:]
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                result[key.strip()] = value.strip()
    return result

def verify_file(source, relative, manifest):
    expected = manifest['files'].get(relative)
    file = source / relative
    if not expected or not file.is_file() or file.is_symlink():
        raise ValueError('Missing verified runtime file: ' + relative)
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    if digest != expected['sha256'] or file.stat().st_size != expected['bytes']:
        raise ValueError('Restored file changed after verification: ' + relative)

def prepare(source, target, uid=None, gid=None):
    source = source.resolve()
    target = target.resolve()
    if source == target or source in target.parents or target in source.parents:
        raise ValueError('Storage must be separate from the restored source directory.')
    if target.exists() and (not target.is_dir() or any(target.iterdir())):
        raise ValueError('Storage must be a fresh, empty directory; existing live data is never overwritten.')
    manifest = json.loads((source / 'manifest.json').read_text())
    if manifest.get('format') != 'portfolio-cms-backup-v1':
        raise ValueError('Use a backup restored with scripts/cms-backup.py first.')
    for name in manifest['files']:
        if name.startswith(('cms/.tmp/', 'cms/public/uploads/', '.cache/')) or name in [
            'cms/.env', 'cms/.spotify-credentials.local', 'cms/.spotify-state.local',
        ]:
            verify_file(source, name, manifest)
    db = source / 'cms/.tmp/data.db'
    with sqlite3.connect(db.as_uri() + '?mode=ro', uri=True) as connection:
        if connection.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('The restored CMS database is not intact.')
        flag = connection.execute(
            'SELECT value FROM strapi_core_store_settings WHERE key = ?',
            ('core_portfolio_seed-v1',),
        ).fetchone()
        if not flag or flag[0] != 'true':
            raise ValueError('The restored database has no portfolio content.')
    config = env_lines(source / 'cms/.env')
    for key in SECRET_KEYS:
        if not config.get(key, '').strip('\"\''):
            raise ValueError('The restored CMS configuration needs ' + key + '.')
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.portfolio-storage-', dir=target.parent))
    try:
        shutil.copytree(source / 'cms/.tmp', staging / 'cms-data')
        shutil.copytree(source / 'cms/public/uploads', staging / 'cms-uploads')
        if (source / '.cache').exists():
            shutil.copytree(source / '.cache', staging / 'site-cache')
        else:
            (staging / 'site-cache').mkdir()
        for name in ['.spotify-credentials.local', '.spotify-state.local']:
            if (source / 'cms' / name).exists():
                shutil.copy2(source / 'cms' / name, staging / 'cms-data' / name)
        lines = [
            'SITE_URL=https://s4meer.com',
            'CMS_URL=https://cms.s4meer.com',
            'SPOTIFY_REDIRECT_URI=https://cms.s4meer.com/spotify-connection/callback',
            'DATA_ROOT=' + str(target),
        ]
        for key in SECRET_KEYS + OPTIONAL_KEYS:
            if key in config:
                lines.append(key + '=' + config[key])
        revalidate = config.get('REVALIDATE_SECRET', '').strip('\"\'')
        lines.append('REVALIDATE_SECRET=' + (config['REVALIDATE_SECRET'] if revalidate else secrets.token_hex(32)))
        private_env = staging / 'coolify.env'
        private_env.write_text('\n'.join(lines) + '\n')
        os.chmod(private_env, 0o600)
        for file in (staging / 'cms-data').rglob('*'):
            if file.is_file():
                os.chmod(file, 0o600)
        for directory in [staging, staging / 'cms-data', staging / 'cms-uploads', staging / 'site-cache']:
            os.chmod(directory, 0o700)
        if uid is not None or gid is not None:
            for item in [staging, *staging.rglob('*')]:
                os.chown(item, uid if uid is not None else -1, gid if gid is not None else -1)
        if target.exists():
            target.rmdir()
        staging.rename(target)
    except BaseException:
        shutil.rmtree(staging)
        raise
    print('Prepared persistent CMS data, uploads, Spotify files and website cache at ' + str(target))
    print('Private Coolify environment file: ' + str(target / 'coolify.env'))
    print('Copy its values into Coolify; keep it and the backup private.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('restored', type=Path)
    parser.add_argument('--target', type=Path, default=Path('/data/portfolio'))
    parser.add_argument('--uid', type=int)
    parser.add_argument('--gid', type=int)
    args = parser.parse_args()
    try:
        prepare(args.restored, args.target, args.uid, args.gid)
    except (ValueError, OSError, sqlite3.Error, KeyError) as error:
        parser.exit(1, 'Storage preparation stopped: ' + str(error) + '\n')
