#!/usr/bin/env python3
"""Create, verify and restore a complete private CMS/application archive."""
import argparse, hashlib, json, os, shutil, sqlite3, tarfile, tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ['cms/src', 'cms/config', 'cms/seed', 'cms/types', 'cms/public',
        'cms/package.json', 'cms/package-lock.json', 'cms/tsconfig.json', 'cms/favicon.png',
        'cms/.env', 'cms/.env.example', 'cms/.spotify-credentials.local', 'cms/.spotify-state.local',
        'src', 'public', 'scripts', 'tests', 'docs', '.cache', 'README.md', 'CMS.md',
        'package.json', 'pnpm-lock.yaml', 'astro.config.mjs', 'tsconfig.json',
        'Dockerfile', 'cms/Dockerfile', 'compose.yaml', '.dockerignore', 'deploy',
        'eslint.config.js', '.gitignore', '.prettierignore', '.prettierrc.mjs',
        '.env', '.env.production', '.env.example']
RESTORE = """# Restore this private backup

This archive includes the CMS and visitor databases, all local uploads, application
source, schemas/configuration, admin accounts, draft/published content, messages,
CMS environment secrets, and Spotify credentials/session when present.
Historical authoring sources live under source-archive/ and are not runtime files.
Keep the archive private: it contains real configuration secrets.

From the current repository:
  python3 scripts/cms-backup.py verify /absolute/path/backup.tar.gz
  python3 scripts/cms-backup.py restore /absolute/path/backup.tar.gz --target /absolute/path/fresh-directory

Restore refuses a non-empty target and verifies all files before writing.
Use Node 22. In the restored directory:
  corepack pnpm install --frozen-lockfile
  npm run cms:install
  npm run cms:build
  corepack pnpm build

For production, update CMS HOST, the public CMS_URL, SITE_URL, matching
REVALIDATE_SECRET values and Spotify callback URL. Keep the restored CMS keys.
Set DATABASE_FILENAME=.tmp/data.db. Start the CMS and Astro as described in README.md.
Persist cms/.tmp/, cms/public/uploads/, the CMS environment/Spotify files and the
website image cache. Stop services before replacing an existing live database.
The backup uses SQLite snapshots, so no WAL/SHM files need restoring.
"""

def sha(file):
    digest = hashlib.sha256()
    with open(file, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def files_at(path):
    if path.is_file(): return [path]
    return sorted(p for p in path.rglob('*') if p.is_file()) if path.exists() else []

def db_info(path):
    with sqlite3.connect(path) as db:
        integrity = db.execute('PRAGMA integrity_check').fetchone()[0]
        if integrity != 'ok': raise ValueError('SQLite integrity failed: ' + path.name)
        return {name: db.execute('SELECT COUNT(*) FROM "' + name.replace('"', '""') + '"').fetchone()[0]
                for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}

def configured_database():
    filename = '.tmp/data.db'
    env = ROOT / 'cms/.env'
    if env.exists():
        for line in env.read_text().splitlines():
            if line.strip().startswith('DATABASE_FILENAME='):
                filename = line.split('=', 1)[1].strip().strip('\"\'')
    source = Path(filename)
    return source if source.is_absolute() else ROOT / 'cms' / source

def create(args):
    output = Path(args.archive).expanduser().resolve()
    if output == ROOT or ROOT in output.parents:
        raise ValueError('Store the private backup outside the repository.')
    if output.exists() and not args.replace: raise ValueError('Backup already exists; use --replace to refresh it safely.')
    plan = json.loads(Path(args.cleanup_plan).read_text()) if args.cleanup_plan else {'remove': [], 'preserveInArchive': []}
    omitted = set(args.omit_archived or [])
    for name in omitted:
        archive_path = Path(name)
        if not name.startswith('source-archive/') or archive_path.is_absolute() or '..' in archive_path.parts:
            raise ValueError('Only safe source-archive paths can be omitted.')
    removed = [ROOT / item for item in plan['remove']]
    def excluded(path):
        return path.name == '.DS_Store' or '__pycache__' in path.parts or any(path == r or r in path.parents for r in removed)
    with tempfile.TemporaryDirectory(prefix='portfolio-cms-snapshot-') as temporary:
        staging = Path(temporary)
        entries = {}
        # Refresh runtime state while retaining authoring sources removed during cleanup.
        if output.exists():
            with tarfile.open(output, 'r:gz') as previous:
                members = checked_members(previous)
                old_manifest = json.load(previous.extractfile('manifest.json'))
                if old_manifest.get('format') != 'portfolio-cms-backup-v1':
                    raise ValueError('Cannot refresh an unsupported backup format.')
                for member in members:
                    if not member.name.startswith('source-archive/'): continue
                    if member.name in omitted: continue
                    copy = staging / member.name
                    copy.parent.mkdir(parents=True, exist_ok=True)
                    with previous.extractfile(member) as source, open(copy, 'xb') as destination:
                        shutil.copyfileobj(source, destination)
                    expected = old_manifest['files'].get(member.name, {})
                    if sha(copy) != expected.get('sha256') or copy.stat().st_size != expected.get('bytes'):
                        raise ValueError('Archived source failed verification: ' + member.name)
                    os.chmod(copy, member.mode & 0o777)
                    entries[member.name] = copy
                if not args.cleanup_plan: plan['remove'] = old_manifest.get('cleanup', [])
        plan['remove'] = [item for item in plan['remove'] if 'source-archive/' + item not in omitted]
        databases = {}
        source_db = configured_database()
        for source, destination in [(source_db, 'cms/.tmp/data.db'), (source_db.with_name('visitors.db'), 'cms/.tmp/visitors.db')]:
            if not source.exists():
                if destination.endswith('/data.db'): raise ValueError('CMS database is missing.')
                continue
            snapshot = staging / destination
            snapshot.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as live, sqlite3.connect(snapshot) as saved:
                live.backup(saved)
            os.chmod(snapshot, 0o600)
            databases[destination] = db_info(snapshot)
            entries[destination] = snapshot
        for item in LIVE:
            for source in files_at(ROOT / item):
                if not excluded(source): entries[source.relative_to(ROOT).as_posix()] = source
        for item in plan['preserveInArchive']:
            for source in files_at(ROOT / item):
                name = 'source-archive/' + source.relative_to(ROOT).as_posix()
                if name not in omitted and source.name != '.DS_Store' and '__pycache__' not in source.parts:
                    entries[name] = source
        # Keep individually retired scripts/assets as source references, without obsolete DB backups.
        for item in plan['remove']:
            source = ROOT / item
            if source.is_file() and source.name != '.DS_Store' and 'source-archive/' + item not in omitted:
                entries['source-archive/' + item] = source
        # Freeze private configuration/session files while the live CMS keeps running.
        for name, source in list(entries.items()):
            if Path(name).name.startswith('.env') or '.local' in name:
                frozen = staging / name
                frozen.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, frozen)
                os.chmod(frozen, 0o600)
                entries[name] = frozen
        instructions = staging / 'RESTORE.md'
        instructions.write_text(RESTORE)
        entries['RESTORE.md'] = instructions
        manifest = {'format': 'portfolio-cms-backup-v1', 'createdAt': datetime.now(timezone.utc).isoformat(),
                    'databaseTables': databases, 'files': {}, 'cleanup': plan['remove']}
        for name, source in sorted(entries.items()):
            manifest['files'][name] = {'sha256': sha(source), 'bytes': source.stat().st_size}
        manifest_path = staging / 'manifest.json'
        manifest_path.write_text(json.dumps(manifest, indent=2))
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary_archive = output.with_name(output.name + '.partial')
        try:
            with open(temporary_archive, 'xb') as stream:
                os.chmod(temporary_archive, 0o600)
                with tarfile.open(fileobj=stream, mode='w:gz', compresslevel=1) as archive:
                    for name, source in sorted(entries.items()): archive.add(source, arcname=name, recursive=False)
                    archive.add(manifest_path, arcname='manifest.json')
            # The previous single backup remains intact until its replacement verifies.
            verify(temporary_archive)
            os.replace(temporary_archive, output)
        finally:
            temporary_archive.unlink(missing_ok=True)
    print(f'Created {output} ({output.stat().st_size / 1024 / 1024:.1f} MiB; {len(manifest["files"])} files).', flush=True)

def checked_members(archive):
    members = archive.getmembers()
    names = set()
    for member in members:
        path = Path(member.name)
        if path.is_absolute() or '..' in path.parts or not member.isfile() or member.name in names:
            raise ValueError('Unsafe or duplicate archive entry: ' + member.name)
        names.add(member.name)
    return members

def verify(archive_path):
    with tarfile.open(archive_path, 'r:gz') as archive:
        members = checked_members(archive)
        manifest = json.load(archive.extractfile('manifest.json'))
        if manifest.get('format') != 'portfolio-cms-backup-v1': raise ValueError('Unsupported backup format.')
        expected = manifest['files']
        if set(expected) | {'manifest.json'} != {m.name for m in members}: raise ValueError('Archive inventory mismatch.')
        with tempfile.TemporaryDirectory(prefix='portfolio-cms-verify-') as temporary:
            for member in members:
                if member.name == 'manifest.json': continue
                digest = hashlib.sha256()
                db_path = Path(temporary) / Path(member.name).name if member.name in manifest['databaseTables'] else None
                destination = open(db_path, 'wb') if db_path else None
                try:
                    with archive.extractfile(member) as stream:
                        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                            digest.update(chunk)
                            if destination: destination.write(chunk)
                finally:
                    if destination: destination.close()
                details = expected[member.name]
                if member.size != details['bytes'] or digest.hexdigest() != details['sha256']:
                    raise ValueError('Checksum failed: ' + member.name)
                if db_path and db_info(db_path) != manifest['databaseTables'][member.name]:
                    raise ValueError('Database table counts differ: ' + member.name)
    print(f'Verified {len(expected)} checksums and {len(manifest["databaseTables"])} intact SQLite databases.', flush=True)
    return manifest

def restore(args):
    target = Path(args.target).expanduser().resolve()
    if target.exists() and (not target.is_dir() or any(target.iterdir())):
        raise ValueError('Restore target must be a fresh, empty directory.')
    manifest = verify(args.archive)
    target.mkdir(parents=True, exist_ok=True, mode=0o700)
    with tarfile.open(args.archive, 'r:gz') as archive:
        for member in checked_members(archive):
            if member.name.startswith('source-archive/') and not args.include_sources: continue
            destination = target / member.name
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as source, open(destination, 'xb') as output:
                shutil.copyfileobj(source, output)
            private = member.name.endswith('.db') or Path(member.name).name.startswith('.env') or '.local' in member.name
            os.chmod(destination, 0o600 if private else member.mode & 0o777)
    for name, rows in manifest['databaseTables'].items():
        if db_info(target / name) != rows: raise ValueError('Restored database differs: ' + name)
    print('Restored runtime files and both databases to ' + str(target), flush=True)

parser = argparse.ArgumentParser(description=__doc__)
sub = parser.add_subparsers(dest='action', required=True)
make = sub.add_parser('create'); make.add_argument('archive'); make.add_argument('--cleanup-plan'); make.add_argument('--replace', action='store_true')
make.add_argument('--omit-archived', action='append', help='Omit one retired source-archive file when refreshing; repeat for additional files.')
check = sub.add_parser('verify'); check.add_argument('archive')
recover = sub.add_parser('restore'); recover.add_argument('archive'); recover.add_argument('--target', required=True); recover.add_argument('--include-sources', action='store_true')
args = parser.parse_args()
try:
    if args.action == 'create': create(args)
    elif args.action == 'restore': restore(args)
    else: verify(args.archive)
except (ValueError, OSError, sqlite3.Error, tarfile.TarError) as error:
    parser.exit(1, 'Backup error: ' + str(error) + '\n')
