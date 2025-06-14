from django.shortcuts import render
from rest_framework import viewsets
from .models import Domain, Term, Definition
from .serializers import DomainSerializer, TermSerializer, DefinitionSerializer

# Create your views here.

class DomainViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows domains to be viewed or edited.
    """
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer


class TermViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows terms to be viewed or edited.
    """
    queryset = Term.objects.all()
    serializer_class = TermSerializer


class DefinitionViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows definitions to be viewed or edited.
    """
    queryset = Definition.objects.all()
    serializer_class = DefinitionSerializer
