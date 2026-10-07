"""Version de l'application : source unique, exposée par l'API."""
import json
import tempfile
from pathlib import Path
from unittest import mock

from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from config import version


class VersionSourceTests(SimpleTestCase):
    def test_version_file_is_semver(self):
        self.assertRegex(version.APP_VERSION, r'^\d+\.\d+\.\d+$')

    def test_frontend_package_matches_version_file(self):
        """Le numéro du site (package.json) suit le fichier VERSION."""
        package = Path(version.VERSION_FILE).parent / 'frontend' / 'package.json'
        data = json.loads(package.read_text(encoding='utf-8'))
        self.assertEqual(data['version'], version.APP_VERSION)

    def test_missing_file_falls_back_to_env(self):
        missing = Path(tempfile.gettempdir()) / 'tn-version-absente'
        with mock.patch.dict('os.environ', {'APP_VERSION': '9.9.9'}):
            self.assertEqual(version.read_version(missing), '9.9.9')


class HealthVersionTests(APITestCase):
    def test_health_exposes_version(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['version'], version.APP_VERSION)
        self.assertIn('commit', response.data)
