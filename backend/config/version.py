"""
Version de l'application.

Une seule source : le fichier VERSION à la racine du dépôt (lu aussi par le
site au build). Variable d'environnement APP_VERSION en secours si le
fichier n'est pas déployé.
"""
import os
from pathlib import Path

VERSION_FILE = Path(__file__).resolve().parent.parent.parent / 'VERSION'


def read_version(path=VERSION_FILE):
    try:
        value = path.read_text(encoding='utf-8').strip()
    except OSError:
        value = ''
    return value or os.environ.get('APP_VERSION', '').strip() or 'inconnue'


APP_VERSION = read_version()

# Commit déployé (fourni par Render), utile pour savoir exactement ce qui tourne
APP_COMMIT = (os.environ.get('RENDER_GIT_COMMIT') or os.environ.get('GIT_COMMIT') or '')[:7]
