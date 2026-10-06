"""
Service d'integration Bamboo Pay (Mobile Money Gabon).

API doc: API_Bamboo_PAY-v9-prod.pdf
Portail marchand: https://marchand-v2.bamboopay-ga.com

Required ENV variables:
  - BAMBOO_PAY_API_URL    (ex: https://client-v2.bamboopay-ga.com)
  - BAMBOO_PAY_MERCHANT_ID
  - BAMBOO_PAY_USERNAME
  - BAMBOO_PAY_PASSWORD
  - BAMBOO_CALLBACK_URL   (URL publique pour webhook, optionnel en dev)
"""

import logging
import os
import time
import requests
from urllib.parse import urlencode
from requests.auth import HTTPBasicAuth

logger = logging.getLogger('bamboo_pay')


class BambooPayError(Exception):
    """Exception levee en cas d'erreur Bamboo Pay."""
    pass


class BambooPayService:
    """Encapsulation des appels API Bamboo Pay v9."""

    def __init__(self):
        self.api_url = os.environ.get('BAMBOO_PAY_API_URL')
        self.merchant_id = os.environ.get('BAMBOO_PAY_MERCHANT_ID')
        self.username = os.environ.get('BAMBOO_PAY_USERNAME')
        self.password = os.environ.get('BAMBOO_PAY_PASSWORD')

        missing = [k for k, v in {
            'BAMBOO_PAY_API_URL': self.api_url,
            'BAMBOO_PAY_MERCHANT_ID': self.merchant_id,
            'BAMBOO_PAY_USERNAME': self.username,
            'BAMBOO_PAY_PASSWORD': self.password,
        }.items() if not v]

        if missing:
            raise RuntimeError(
                f"Variables ENV Bamboo Pay manquantes: {', '.join(missing)}. "
                f"Verifiez votre .env ou vos variables d'environnement."
            )

        self.callback_url = self._build_callback_url(
            os.environ.get('BAMBOO_CALLBACK_URL', ''),
            os.environ.get('BAMBOO_WEBHOOK_SECRET', ''),
        )
        self.auth = HTTPBasicAuth(self.username, self.password)

    @staticmethod
    def _build_callback_url(url, secret):
        """Ajoute le jeton secret du webhook à l'URL de callback (si configuré)."""
        if not url or not secret or 'token=' in url:
            return url
        separator = '&' if '?' in url else '?'
        return f"{url}{separator}{urlencode({'token': secret})}"

    def initiate_instant_payment(self, phone, amount, payer_name,
                                  reference, operator):
        """
        Methode B — Paiement instantane (sans redirection).
        Le client recoit un push USSD et valide avec son PIN.

        Args:
            phone: Numero du payeur (ex: "074301639")
            amount: Montant en FCFA (string)
            payer_name: Nom du payeur
            reference: Reference marchand unique (ex: "TN-ORDER-42")
            operator: "moov_money" ou "airtel_money"
            callback_url: URL webhook optionnelle (Phase 3)

        Returns:
            dict: {
                "reference_bp": "TXN-2025-000381",  # ref Bamboo Pay
                "reference": "TN-ORDER-42",          # ref marchand
                "status": True/False,
                "message": None ou erreur
            }

        Raises:
            BambooPayError: en cas d'echec reseau ou API
        """
        start = time.time()

        # Normaliser : numéros gabonais = 9 chiffres avec 0 initial
        phone_clean = phone.strip()
        if len(phone_clean) == 8 and not phone_clean.startswith('0'):
            phone_clean = '0' + phone_clean

        payload = {
            'phone': phone_clean,
            'amount': str(amount),
            'payer_name': payer_name,
            'reference': reference,
            'merchant_id': self.merchant_id,
            'callback_url': self.callback_url,
            'operateur': operator,
        }

        logger.info(
            "bamboo.initiate_payload ref=%s op=%s phone=%s amount=%s "
            "callback_configured=%s merchant=%s",
            reference, operator, phone_clean[:3] + '****' + phone_clean[-2:], amount,
            bool(self.callback_url), self.merchant_id
        )

        try:
            response = requests.post(
                f"{self.api_url}/api/mobile/instant-payment",
                json=payload,
                auth=self.auth,
                timeout=30,
            )
            duration = time.time() - start

            logger.info(
                "bamboo.initiate ref=%s op=%s phone=%s amount=%s "
                "status_http=%d duration=%.3fs",
                reference, operator, phone[:4] + '****',
                amount, response.status_code, duration
            )

            if response.status_code == 202:
                data = response.json()
                return data

            if response.status_code == 401:
                data = response.json()
                raise BambooPayError(
                    f"Authentification echouee: {data.get('message', 'Unauthorized')}"
                )

            if response.status_code == 422:
                data = response.json()
                raise BambooPayError(
                    f"Validation echouee: {data}"
                )

            # 400, 500, etc.
            raw_body = response.text
            logger.error(
                "bamboo.initiate_error ref=%s status_http=%d body=%s",
                reference, response.status_code, raw_body[:500]
            )
            data = {}
            try:
                data = response.json()
            except Exception:
                pass
            raise BambooPayError(
                f"Erreur Bamboo Pay HTTP {response.status_code}: {data or raw_body[:200]}"
            )

        except requests.RequestException as e:
            duration = time.time() - start
            logger.error(
                "bamboo.initiate FAILED ref=%s op=%s duration=%.3fs err=%s",
                reference, operator, duration, str(e)
            )
            raise BambooPayError(f"Erreur reseau: {e}") from e

    def check_status(self, transaction_id):
        """
        Methode C — Verification du statut d'une transaction.

        Args:
            transaction_id: Reference Bamboo Pay (TXN-...) OU reference marchand

        Returns:
            dict: {
                "message": "OK",
                "code": 200,
                "transaction": {
                    "status": "completed" | "failed" | "pending",
                    "code": 200,
                    "message": "Statut ..."
                }
            }

        Raises:
            BambooPayError: en cas d'echec
        """
        start = time.time()

        try:
            response = requests.get(
                f"{self.api_url}/api/check-status/{transaction_id}",
                auth=self.auth,
                timeout=15,
            )
            duration = time.time() - start

            logger.info(
                "bamboo.check_status ref=%s status_http=%d duration=%.3fs",
                transaction_id, response.status_code, duration
            )

            if response.status_code == 200:
                data = response.json()
                return data

            if response.status_code == 404:
                data = response.json()
                raise BambooPayError(
                    f"Transaction introuvable: {transaction_id}"
                )

            if response.status_code == 401:
                data = response.json()
                raise BambooPayError(
                    f"Authentification echouee: {data.get('message', 'Unauthorized')}"
                )

            raise BambooPayError(
                f"Erreur Bamboo Pay HTTP {response.status_code}"
            )

        except requests.RequestException as e:
            duration = time.time() - start
            logger.error(
                "bamboo.check_status FAILED ref=%s duration=%.3fs err=%s",
                transaction_id, duration, str(e)
            )
            raise BambooPayError(f"Erreur reseau: {e}") from e


# Singleton reutilisable
_service = None


def get_bamboo_service():
    """Retourne une instance singleton du service Bamboo Pay."""
    global _service
    if _service is None:
        _service = BambooPayService()
    return _service
