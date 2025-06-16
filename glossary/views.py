from django.shortcuts import render
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Domain, Term, Definition
from .serializers import DomainSerializer, TermSerializer, DefinitionSerializer, DefinitionWriteSerializer, UserSerializer
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
import requests


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        user_serializer = UserSerializer(user)
        return Response({
            'token': token.key,
            'user': user_serializer.data
        })

class ValidateUrlView(APIView):
    """
    An API endpoint to validate a URL.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        url = request.data.get('url')
        if not url:
            return Response({'detail': 'URL not provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Internal links are considered valid without checking
        if not url.startswith('http://') and not url.startswith('https://'):
            return Response({'status': 'valid'}, status=status.HTTP_200_OK)

        try:
            # Use a timeout and allow redirects. A HEAD request is more efficient.
            response = requests.head(url, timeout=5, allow_redirects=True)
            
            if not (200 <= response.status_code < 400):
                return Response(
                    {'detail': f"The link returned a status of {response.status_code}."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except requests.RequestException:
            # This catches connection errors, timeouts, etc.
            return Response(
                {'detail': "The link could not be reached. Please check your connection and the URL."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({'status': 'valid'}, status=status.HTTP_200_OK)

# Create your views here.

class DomainViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows domains to be viewed or edited.
    """
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
    filterset_fields = ['name']
    search_fields = ['name', 'description']


class TermViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows terms to be viewed or edited.
    """
    queryset = Term.objects.all()
    serializer_class = TermSerializer
    filterset_fields = ['text']
    search_fields = ['text']


class DefinitionViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows definitions to be viewed or edited.
    """
    queryset = Definition.objects.all()
    serializer_class = DefinitionSerializer
    filterset_fields = ['term__id', 'term__text', 'domain__name', 'status']
    search_fields = ['term__text', 'definition_text']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DefinitionWriteSerializer
        return DefinitionSerializer

    def perform_create(self, serializer):
        """Sets the creator of the definition to the current user if authenticated."""
        if self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user, updated_by=self.request.user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        """Sets the updater of the definition to the current user if authenticated."""
        if self.request.user.is_authenticated:
            serializer.save(updated_by=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        Approve a definition.
        """
        try:
            definition = self.get_object()
            user = request.user

            if not user.is_authenticated:
                return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            if definition.created_by == user:
                return Response({'detail': 'You cannot approve your own definition.'}, status=status.HTTP_403_FORBIDDEN)

            if definition.approvers.filter(pk=user.pk).exists():
                return Response({'detail': 'You have already approved this definition.'}, status=status.HTTP_400_BAD_REQUEST)

            if definition.status == 'approved':
                return Response({'status': 'already approved'}, status=status.HTTP_400_BAD_REQUEST)

            definition.approvers.add(user)
            definition.updated_by = user
            
            if definition.approvers.count() >= settings.MIN_APPROVALS:
                definition.status = 'approved'

            definition.save()
            return Response(self.get_serializer(definition).data)
        except Definition.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """
        Reject a definition.
        """
        try:
            definition = self.get_object()
            if definition.status == 'rejected':
                return Response({'status': 'already rejected'}, status=status.HTTP_400_BAD_REQUEST)

            definition.status = 'rejected'
            if request.user.is_authenticated:
                definition.updated_by = request.user
            definition.save()
            return Response(self.get_serializer(definition).data)
        except Definition.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
