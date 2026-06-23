#!/usr/bin/env python3
import json
import os
import shlex
import subprocess
import urllib.request
from pathlib import Path

ADMIN = 'http://127.0.0.1:2019'
ROUTE_ID = 'begood-production-route'
APP_DIR = Path('/home/openclaw/.openclaw/workspace/projects/begood')


def read_env_value(name: str) -> str:
    env_path = APP_DIR / '.env.local'
    if not env_path.exists():
        return os.environ.get(name, '')
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        if key == name:
            return shlex.split(value)[0] if value else ''
    return os.environ.get(name, '')


def caddy_hash_password(password: str) -> str:
    return subprocess.check_output(
        ['caddy', 'hash-password', '--plaintext', password],
        text=True,
    ).strip()


def get_config():
    with urllib.request.urlopen(f'{ADMIN}/config/') as resp:
        return json.load(resp)


def post_config(cfg):
    data = json.dumps(cfg).encode('utf-8')
    req = urllib.request.Request(
        f'{ADMIN}/load',
        data=data,
        method='POST',
        headers={'Content-Type': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()


def main():
    password = read_env_value('APP_PASSWORD')
    if not password:
        raise SystemExit('APP_PASSWORD is required for production Caddy auth')

    cfg = get_config()
    servers = cfg.get('apps', {}).get('http', {}).get('servers', {})
    srv = servers.get('srv1')
    if not srv:
        raise SystemExit('Caddy server srv1 not found')

    route0 = srv.get('routes', [])[0]
    subroute = route0.get('handle', [])[0]
    routes = subroute.get('routes', [])

    hashed = caddy_hash_password(password)
    new_route = {
        '@id': ROUTE_ID,
        'match': [{'path': ['/begood*']}],
        'handle': [
            {
                'handler': 'authentication',
                'providers': {
                    'http_basic': {
                        'accounts': [
                            {'username': 'begood', 'password': hashed}
                        ],
                        'hash': {'algorithm': 'bcrypt'},
                        'hash_cache': {},
                    }
                },
            },
            {
                'handler': 'reverse_proxy',
                'upstreams': [{'dial': '127.0.0.1:3000'}],
            },
        ],
    }

    # Remove any previous BeGood route, including unauthenticated versions.
    routes[:] = [r for r in routes if r.get('@id') != ROUTE_ID]

    # Insert immediately before the final catch-all route.
    insert_at = len(routes)
    for i, route in enumerate(routes):
        if route.get('match') is None:
            insert_at = i
            break
    routes.insert(insert_at, new_route)
    post_config(cfg)
    print('Installed BeGood Caddy route /begood* with basic auth -> 127.0.0.1:3000')


if __name__ == '__main__':
    main()
