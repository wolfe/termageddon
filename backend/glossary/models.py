from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models
from unidecode import unidecode


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted objects"""

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class AllObjectsManager(models.Manager):
    """Manager that includes all objects, including soft-deleted ones"""

    def get_queryset(self):
        return super().get_queryset()


class AuditedModel(models.Model):
    """Abstract base model with audit fields and soft delete functionality"""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
    )
    is_deleted = models.BooleanField(default=False)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Soft delete - set is_deleted flag instead of actually deleting"""
        self.is_deleted = True
        self.save(using=using)

    def hard_delete(self, using=None, keep_parents=False):
        """Actually delete the object from the database"""
        super().delete(using=using, keep_parents=keep_parents)


class Domain(AuditedModel):
    """Domain or category for terms (e.g., 'Finance', 'Technology')"""

    name = models.CharField(max_length=100)
    name_normalized = models.CharField(max_length=100, editable=False, db_index=True, default='')
    description = models.TextField(blank=True)

    class Meta:
        db_table = "glossary_domain"

    def __str__(self):
        return self.name

    def clean(self):
        """Validate uniqueness among non-deleted records"""
        super().clean()
        existing = (
            Domain.all_objects.filter(name=self.name, is_deleted=False)
            .exclude(pk=self.pk)
            .exists()
        )
        if existing:
            raise ValidationError({"name": "A domain with this name already exists."})

    def save(self, *args, **kwargs):
        # Auto-populate name_normalized
        self.name_normalized = unidecode(self.name.lower())
        self.full_clean()
        super().save(*args, **kwargs)


class Term(AuditedModel):
    """A term in the glossary - globally unique"""

    text = models.CharField(max_length=255)
    text_normalized = models.CharField(max_length=255, editable=False, db_index=True)
    is_official = models.BooleanField(
        default=False, help_text="Indicates term has official status"
    )

    class Meta:
        db_table = "glossary_term"

    def __str__(self):
        return self.text

    def clean(self):
        """Validate uniqueness among non-deleted records"""
        super().clean()
        existing = (
            Term.all_objects.filter(text=self.text, is_deleted=False)
            .exclude(pk=self.pk)
            .exists()
        )
        if existing:
            raise ValidationError({"text": "A term with this text already exists."})

    def save(self, *args, **kwargs):
        # Auto-populate text_normalized
        self.text_normalized = unidecode(self.text.lower())
        self.full_clean()
        super().save(*args, **kwargs)


class Entry(AuditedModel):
    """An entry represents a (term, domain) pair"""

    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name="entries")
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name="entries")
    active_version = models.ForeignKey(
        "EntryVersion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="active_entries",
    )
    is_official = models.BooleanField(
        default=False,
        help_text="Indicates this is the official definition for this term in this domain",
    )

    class Meta:
        db_table = "glossary_entry"

    def __str__(self):
        return f"{self.term.text} ({self.domain.name})"

    def clean(self):
        """Validate term+domain uniqueness among non-deleted records"""
        super().clean()
        existing = (
            Entry.all_objects.filter(
                term=self.term, domain=self.domain, is_deleted=False
            )
            .exclude(pk=self.pk)
            .exists()
        )
        if existing:
            raise ValidationError(
                "An entry for this term and domain combination already exists."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class EntryVersion(AuditedModel):
    """A version of an entry's definition - requires approval to become active"""

    entry = models.ForeignKey(Entry, on_delete=models.CASCADE, related_name="versions")
    content = models.TextField(help_text="Rich HTML content (sanitized on save)")
    author = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="authored_versions"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    approvers = models.ManyToManyField(
        User, related_name="approved_versions", blank=True
    )
    requested_reviewers = models.ManyToManyField(
        User,
        related_name="requested_reviews",
        blank=True,
        help_text="Users specifically requested to review this version",
    )
    is_published = models.BooleanField(
        default=False, help_text="Whether this version has been published as active"
    )
    endorsed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="endorsed_versions",
        help_text="Domain expert who endorsed this version"
    )
    endorsed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "glossary_entry_version"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.entry} - v{self.id} by {self.author.username}"

    @property
    def is_approved(self):
        """Check if this version has enough approvals"""
        return self.approvers.count() >= settings.MIN_APPROVALS

    @property
    def approval_count(self):
        """Return the number of approvals"""
        return self.approvers.count()

    @property
    def is_endorsed(self):
        """Check if this version has been endorsed by a domain expert"""
        return self.endorsed_by is not None

    def clean(self):
        """Validate max 1 unpublished version per author per entry"""
        super().clean()
        if not self.pk:  # Only check on creation
            existing_unpublished = EntryVersion.objects.filter(
                entry=self.entry,
                author=self.author,
                is_deleted=False,
                is_published=False,
            ).exclude(pk=self.pk)

            if existing_unpublished.exists():
                raise ValidationError(
                    f"You already have an unpublished version for this entry. "
                    f"Please edit the existing version or wait for it to be published first."
                )

    def approve(self, user):
        """Add a user as an approver if valid"""
        if user == self.author:
            raise ValidationError("Authors cannot approve their own versions.")

        if self.approvers.filter(pk=user.pk).exists():
            raise ValidationError("You have already approved this version.")

        self.approvers.add(user)

    def request_review(self, user, reviewers):
        """Request specific users to review this version"""
        if user != self.author:
            raise ValidationError("Only the author can request reviews.")

        if self.is_published:
            raise ValidationError("Cannot request reviews for published versions.")

        self.requested_reviewers.set(reviewers)

    def clear_approvals(self):
        """Clear all approvals (used when content is edited)"""
        self.approvers.clear()

    def publish(self, user):
        """Publish this version as the active version"""
        if not self.is_approved:
            raise ValidationError("Version must be approved before publishing.")

        if self.is_published:
            raise ValidationError("Version is already published.")

        # Set this version as the active version
        self.entry.active_version = self
        self.entry.save()

        # Mark as published
        self.is_published = True
        self.save()

    def save(self, *args, **kwargs):
        # If content is being updated and there are existing approvals, clear them
        if self.pk:
            try:
                old_version = EntryVersion.objects.get(pk=self.pk)
                if (
                    old_version.content != self.content
                    and old_version.approvers.exists()
                ):
                    self.clear_approvals()
            except EntryVersion.DoesNotExist:
                pass

        self.full_clean()
        super().save(*args, **kwargs)


class Comment(AuditedModel):
    """Comments can be attached to any model using GenericForeignKey"""

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    text = models.TextField()
    author = models.ForeignKey(User, on_delete=models.PROTECT, related_name="comments")
    is_resolved = models.BooleanField(default=False)

    class Meta:
        db_table = "glossary_comment"
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author.username} on {self.content_object}"

    def clean(self):
        """Validate that only top-level comments can be resolved"""
        super().clean()
        if self.parent and self.is_resolved:
            raise ValidationError("Only top-level comments can be resolved.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class DomainExpert(AuditedModel):
    """Tracks which users are experts for which domains"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="expertise")
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name="experts")
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_experts",
    )

    class Meta:
        db_table = "glossary_domain_expert"

    def __str__(self):
        return f"{self.user.username} - {self.domain.name}"

    def clean(self):
        """Validate user+domain uniqueness among non-deleted records"""
        super().clean()
        existing = (
            DomainExpert.all_objects.filter(
                user=self.user, domain=self.domain, is_deleted=False
            )
            .exclude(pk=self.pk)
            .exists()
        )
        if existing:
            raise ValidationError(
                "This user is already a domain expert for this domain."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# Helper method to check if a user is a domain expert
def is_domain_expert_for(user, domain_id):
    """Check if a user is a domain expert for a specific domain"""
    return DomainExpert.objects.filter(user=user, domain_id=domain_id).exists()


# Monkey-patch the User model to add the helper method
User.add_to_class("is_domain_expert_for", is_domain_expert_for)


# Signal to auto-activate approved versions
from django.db.models.signals import m2m_changed
from django.dispatch import receiver


@receiver(m2m_changed, sender=EntryVersion.approvers.through)
def auto_activate_approved_version(sender, instance, action, **kwargs):
    """
    When an EntryVersion is approved (approval_count >= MIN_APPROVALS),
    check if entry.active_version is None or older than this version,
    and if so, set this as entry.active_version
    """
    if action == "post_add":
        if instance.is_approved:
            entry = instance.entry
            # Check if this should become the active version
            if entry.active_version is None or (
                entry.active_version
                and instance.timestamp > entry.active_version.timestamp
            ):
                # Use update() to avoid triggering save signal loops
                Entry.objects.filter(pk=entry.pk).update(active_version=instance)
