from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Domain, Term, Definition
from .serializers import DomainSerializer, TermSerializer, DefinitionSerializer

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
    filterset_fields = ['term__text', 'domain__name', 'status']
    search_fields = ['term__text', 'definition_text']

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        Approve a definition.
        """
        try:
            definition = self.get_object()
            if definition.status == 'approved':
                return Response({'status': 'already approved'}, status=status.HTTP_400_BAD_REQUEST)

            definition.status = 'approved'
            # Assuming the approver is the logged-in user
            if request.user.is_authenticated:
                definition.approvers.add(request.user)
                definition.updated_by = request.user
            definition.save()
            return Response(self.get_serializer(definition).data)
        except Definition.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
