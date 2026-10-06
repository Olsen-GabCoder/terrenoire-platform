import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import PublicEndpointThrottle
from .models import Coupon
from .serializers import CouponValidateSerializer, CouponSerializer
from apps.core.email import run_in_background

logger = logging.getLogger(__name__)


class CouponValidateView(APIView):
    """Valider un code promo (public)."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        serializer = CouponValidateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(
                {'valid': False, 'message': serializer.errors.get('code', ['Code promo invalide.'])[0]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        code = serializer.validated_data['code']
        coupon = Coupon.objects.get(code=code)
        if coupon.discount_type == 'percent':
            return Response({'valid': True, 'discount_percent': float(coupon.discount_value), 'discount_amount': None, 'message': f"{int(coupon.discount_value)}% de reduction applique"})
        return Response({'valid': True, 'discount_percent': None, 'discount_amount': float(coupon.discount_value), 'message': f"{int(coupon.discount_value)} FCFA de reduction applique"})


class CouponListCreateView(APIView):
    """Liste et creation de coupons (admin)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        coupons = Coupon.objects.all().order_by('-created_at')
        serializer = CouponSerializer(coupons, many=True)
        return Response({'results': serializer.data})

    def post(self, request):
        serializer = CouponSerializer(data=request.data)
        if serializer.is_valid():
            coupon = serializer.save()
            # Envoyer par email si destinataire specifie
            if coupon.recipient_email:
                def _send(c):
                    try:
                        from apps.core.email import send_coupon_email
                        send_coupon_email(c)
                    except Exception as e:
                        logger.exception("Erreur envoi coupon %s a %s: %s", c.code, c.recipient_email, e)
                run_in_background(_send, coupon)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CouponDetailView(APIView):
    """Modification et suppression d'un coupon (admin)."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            coupon = Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CouponSerializer(coupon, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            coupon = Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        coupon.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
