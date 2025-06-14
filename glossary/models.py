from django.db import models
from django.contrib.auth.models import User


class Domain(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Term(models.Model):
    text = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.text


class Definition(models.Model):
    STATUS_CHOICES = [
        ('proposed', 'Proposed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='definitions')
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name='definitions')
    definition_text = models.TextField()
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='proposed_definitions')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='proposed')
    approvers = models.ManyToManyField(User, related_name='approved_definitions', blank=True)

    def __str__(self):
        return f'{self.term.text} ({self.domain.name}): {self.definition_text[:50]}...'
