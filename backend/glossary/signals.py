import threading

from django.db.models.signals import m2m_changed, post_save, pre_save
from django.dispatch import receiver

from glossary.models import Comment, EntryDraft, Notification

# Thread-local storage to track old content before save
_thread_locals = threading.local()


@receiver(pre_save, sender=EntryDraft)
def store_old_draft_content(*args, instance, **kwargs):
    """Store old draft content before save for comparison"""
    if instance.pk:
        try:
            old_draft = EntryDraft.objects.get(pk=instance.pk)
            _thread_locals.old_content = old_draft.content
        except EntryDraft.DoesNotExist:
            _thread_locals.old_content = None
    else:
        _thread_locals.old_content = None


@receiver(post_save, sender=EntryDraft)
def notify_draft_edited(*args, instance, created, **kwargs):
    """Notify draft author when draft is edited by someone else"""
    if created:
        return  # Don't notify on creation

    # Check if content was changed
    old_content = getattr(_thread_locals, "old_content", None)
    if (
        old_content is not None
        and old_content != instance.content
        and instance.updated_by
        and instance.author != instance.updated_by
    ):
        try:
            Notification.objects.create(
                user=instance.author,
                type="draft_edited",
                message=(
                    f"{instance.updated_by.get_full_name() or instance.updated_by.username} "
                    f"edited your draft for '{instance.entry.term.text}'"
                ),
                related_draft=instance,
            )
        except Exception:
            pass  # Silently fail if notification creation fails


@receiver(m2m_changed, sender=EntryDraft.approvers.through)
def notify_draft_approved(*args, instance, action, pk_set, **kwargs):
    """Notify draft author when draft is approved"""
    if action == "post_add":
        # Check if draft just became approved (has enough approvals now)
        from django.conf import settings
        from django.contrib.auth.models import User

        approver_ids = pk_set
        if approver_ids and instance.approvers.count() >= settings.MIN_APPROVALS:
            # Check if notification already exists (to avoid duplicates when adding multiple approvers)
            if not Notification.objects.filter(
                user=instance.author,
                type="draft_approved",
                related_draft=instance,
            ).exists():
                # Draft just became approved
                approvers = User.objects.filter(id__in=approver_ids)
                approver_names = ", ".join([approver.get_full_name() or approver.username for approver in approvers])
                Notification.objects.create(
                    user=instance.author,
                    type="draft_approved",
                    message=f"Your draft for '{instance.entry.term.text}' was approved by {approver_names}",
                    related_draft=instance,
                )


@receiver(post_save, sender=Comment)
def notify_comment_mentions_and_replies(*args, instance, created, **kwargs):
    """Notify users when @mentioned in comment or when comment is replied to"""
    if not created:
        return

    # Notify mentioned users
    if instance.mentioned_users.exists():
        for mentioned_user in instance.mentioned_users.all():
            # Don't notify if user mentioned themselves
            if mentioned_user != instance.author:
                Notification.objects.create(
                    user=mentioned_user,
                    type="mentioned_in_comment",
                    message=(
                        f"{instance.author.get_full_name() or instance.author.username} "
                        f"mentioned you in a comment on '{instance.draft.entry.term.text}'"
                    ),
                    related_comment=instance,
                    related_draft=instance.draft,
                )

    # Notify comment author when someone replies (if not the author themselves)
    if instance.parent and instance.parent.author != instance.author:
        Notification.objects.create(
            user=instance.parent.author,
            type="comment_reply",
            message=(
                f"{instance.author.get_full_name() or instance.author.username} "
                f"replied to your comment on '{instance.draft.entry.term.text}'"
            ),
            related_comment=instance,
            related_draft=instance.draft,
        )


@receiver(m2m_changed, sender=EntryDraft.requested_reviewers.through)
def notify_review_requested(*args, instance, action, pk_set, **kwargs):
    """Notify users when they are requested to review a draft"""
    if action == "post_add":
        from django.contrib.auth.models import User

        reviewer_ids = pk_set
        reviewers = User.objects.filter(id__in=reviewer_ids)
        for reviewer in reviewers:
            # Don't notify if reviewer is the author
            if reviewer != instance.author:
                Notification.objects.create(
                    user=reviewer,
                    type="review_requested",
                    message=(
                        f"You were requested to review a draft for "
                        f"'{instance.entry.term.text}' by "
                        f"{instance.author.get_full_name() or instance.author.username}"
                    ),
                    related_draft=instance,
                )
