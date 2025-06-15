from rest_framework import serializers
from .models import Domain, Term, Definition
from django.contrib.auth.models import User
import requests
from bs4 import BeautifulSoup


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'is_staff']


class DomainSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)

    class Meta:
        model = Domain
        fields = '__all__'


class TermSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    domains = serializers.SerializerMethodField()

    class Meta:
        model = Term
        fields = '__all__'

    def get_domains(self, obj):
        return [d.name for d in Domain.objects.filter(definitions__term=obj).distinct()]


class DefinitionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Definition
        fields = ['term', 'domain', 'definition_text']

    def validate_definition_text(self, value):
        """
        Parses the definition HTML, finds all links, and validates them.
        - External links are checked for a 2xx or 3xx status code.
        - Internal links (relative paths) are assumed to be valid.
        """
        soup = BeautifulSoup(value, 'html.parser')
        links = soup.find_all('a')
        
        for link in links:
            url = link.get('href')
            if not url:
                continue

            # Check if it's an external link
            if url.startswith('http://') or url.startswith('https://'):
                try:
                    # Use a timeout and allow redirects. A HEAD request is more efficient.
                    response = requests.head(url, timeout=5, allow_redirects=True)
                    
                    if not (200 <= response.status_code < 400):
                        raise serializers.ValidationError(
                            f"The link '{url}' appears to be broken (Status: {response.status_code}). Please check the URL."
                        )
                except requests.RequestException:
                    # This catches connection errors, timeouts, etc.
                    raise serializers.ValidationError(
                        f"The link '{url}' could not be reached. Please check your connection and the URL."
                    )
        return value


class DefinitionSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    term = TermSerializer(read_only=True)
    domain = DomainSerializer(read_only=True)
    approvers = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Definition
        fields = '__all__' 