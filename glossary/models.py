from django.db import models
from django.contrib.auth.models import User
from django_ckeditor_5.fields import CKEditor5Field


class ActiveManager(models.Manager):
    """Returns only active (non-deleted) objects."""
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class AuditedModel(models.Model):
    """
    An abstract base model that provides soft-deletion, created/updated timestamps,
    and fields for tracking the user who created or updated the object.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_created_by"
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_updated_by"
    )
    is_deleted = models.BooleanField(default=False)

    objects = ActiveManager()
    all_objects = models.Manager()

    def delete(self, using=None, keep_parents=False):
        """Overrides the default delete to perform a soft-delete."""
        self.is_deleted = True
        self.save()

    def undelete(self):
        """Restores a soft-deleted object."""
        self.is_deleted = False
        self.save()

    class Meta:
        abstract = True
        ordering = ['-updated_at']


class Domain(AuditedModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Term(AuditedModel):
    text = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.text


class Definition(AuditedModel):
    STATUS_CHOICES = [
        ('proposed', 'Proposed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='definitions')
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name='definitions')
    definition_text = CKEditor5Field('Text', config_name='default')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='proposed')
    approvers = models.ManyToManyField(User, related_name='approved_definitions', blank=True)

    def __str__(self):
        return f'{self.term.text} ({self.domain.name}): {self.definition_text[:50]}...'
