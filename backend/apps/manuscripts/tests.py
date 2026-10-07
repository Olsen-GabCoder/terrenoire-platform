"""Tests pour l'app manuscripts."""
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Manuscript

User = get_user_model()


class ManuscriptSubmitTest(APITestCase):
    """Tests de soumission de manuscrit."""

    def _valid_payload(self, **overrides):
        pdf = SimpleUploadedFile('manuscript.pdf', b'%PDF-1.4 fake content', content_type='application/pdf')
        data = {
            'title': 'Mon Roman',
            'author_name': 'Auteur Test',
            'email': 'auteur@example.com',
            'phone_number': '+24177123456',
            'genre': 'ROMAN',
            'language': 'FR',
            'description': 'A' * 60,
            'terms_accepted': True,
            'file': pdf,
        }
        data.update(overrides)
        return data

    def test_submit_missing_file(self):
        """Soumission sans fichier doit echouer."""
        data = self._valid_payload()
        del data['file']
        response = self.client.post('/api/manuscripts/submit/', data)
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY])

    def test_submit_success(self):
        """Soumission valide avec PDF."""
        response = self.client.post('/api/manuscripts/submit/', self._valid_payload(), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Manuscript.objects.filter(title='Mon Roman').exists())

    def test_submit_invalid_mime_type(self):
        """Soumission avec un fichier .exe renomme en .pdf doit echouer."""
        fake_exe = SimpleUploadedFile('malware.pdf', b'MZ\x90\x00', content_type='application/x-msdownload')
        response = self.client.post('/api/manuscripts/submit/', self._valid_payload(file=fake_exe), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_description_too_short(self):
        """Description de moins de 50 caracteres doit echouer."""
        response = self.client.post('/api/manuscripts/submit/', self._valid_payload(description='Trop court'), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ManuscriptSoftDeleteTest(APITestCase):
    """Tests du soft-delete manuscrit."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin', email='admin@test.com', password='AdminPass123!',
        )
        pdf = SimpleUploadedFile('test.pdf', b'%PDF-1.4 content', content_type='application/pdf')
        self.manuscript = Manuscript.objects.create(
            title='Test Manuscrit',
            author_name='Auteur',
            email='a@test.com',
            phone_number='+24177000000',
            genre='ROMAN',
            language='FR',
            description='A' * 60,
            terms_accepted=True,
            file=pdf,
        )

    def test_delete_is_soft(self):
        """DELETE ne supprime pas en base, marque is_deleted=True."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/manuscripts/{self.manuscript.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manuscript.refresh_from_db()
        self.assertTrue(self.manuscript.is_deleted)
        self.assertIsNotNone(self.manuscript.deleted_at)

    def test_deleted_manuscript_hidden_from_list(self):
        """Un manuscrit soft-delete n'apparait plus dans la liste."""
        self.manuscript.is_deleted = True
        self.manuscript.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/manuscripts/')
        ids = [m['id'] for m in response.data]
        self.assertNotIn(self.manuscript.id, ids)


class ManuscriptFileContentTest(APITestCase):
    """Le contenu réel du fichier est vérifié, pas seulement l'extension."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()

    def _payload(self, upload):
        return {
            'title': 'Mon Roman', 'author_name': 'Auteur Test', 'email': 'auteur@example.com',
            'phone_number': '+24177123456', 'genre': 'ROMAN', 'language': 'FR',
            'description': 'A' * 60, 'terms_accepted': True, 'file': upload,
        }

    def test_fake_pdf_is_rejected(self):
        fake = SimpleUploadedFile('roman.pdf', b'<html><script>alert(1)</script></html>', content_type='application/pdf')
        response = self.client.post('/api/manuscripts/submit/', self._payload(fake))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Manuscript.objects.count(), 0)

    def test_real_docx_is_accepted_by_validation(self):
        import zipfile
        from .serializers import _file_content_matches_extension
        buf = BytesIO()
        with zipfile.ZipFile(buf, 'w') as z:
            z.writestr('word/document.xml', '<w:document/>')
        docx = SimpleUploadedFile('roman.docx', buf.getvalue())
        self.assertTrue(_file_content_matches_extension(docx))
        zip_not_word = BytesIO()
        with zipfile.ZipFile(zip_not_word, 'w') as z:
            z.writestr('evil.exe', 'x')
        self.assertFalse(_file_content_matches_extension(SimpleUploadedFile('roman.docx', zip_not_word.getvalue())))
        self.assertTrue(_file_content_matches_extension(
            SimpleUploadedFile('roman.doc', b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1' + b'0' * 20)))
