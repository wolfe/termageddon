from rest_framework import serializers
from .models import Domain, Term, Definition
from django.contrib.auth.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class DomainSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)

    class Meta:
        model = Domain
        fields = '__all__'


class TermSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)

    class Meta:
        model = Term
        fields = '__all__'


class DefinitionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Definition
        fields = ['term', 'domain', 'definition_text']


class DefinitionSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    term = TermSerializer(read_only=True)
    domain = DomainSerializer(read_only=True)
    approvers = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Definition
        fields = '__all__' 