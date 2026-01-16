from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.db import models
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.utils.html import format_html
from django.views.decorators.csrf import csrf_protect

from glossary.models import (
    Comment,
    Entry,
    EntryDraft,
    Notification,
    Perspective,
    PerspectiveCurator,
    Reaction,
    Term,
    UserProfile,
)
from glossary.utils import load_entries_from_csv


# Custom actions
def soft_delete_selected(modeladmin, request, queryset):
    """Soft delete selected objects"""
    for obj in queryset:
        obj.delete()  # Uses soft delete from AuditedModel
    modeladmin.message_user(request, f"Soft deleted {queryset.count()} items.")


soft_delete_selected.short_description = "Soft delete selected items"


def undelete_selected(modeladmin, request, queryset):
    """Undelete selected objects"""
    count = queryset.update(is_deleted=False)
    modeladmin.message_user(request, f"Restored {count} items.")


undelete_selected.short_description = "Undelete selected items"


def mark_official_selected(modeladmin, request, queryset):
    """Mark selected items as official"""
    count = queryset.update(is_official=True)
    modeladmin.message_user(request, f"Marked {count} items as official.")


mark_official_selected.short_description = "Mark as official"


def bulk_approve_drafts(modeladmin, request, queryset):
    """Approve selected entry drafts with current user"""
    count = 0
    for draft in queryset:
        try:
            draft.approve(request.user)
            count += 1
        except Exception as e:
            modeladmin.message_user(
                request, f"Could not approve draft {draft.id}: {e}", level="ERROR"
            )
    modeladmin.message_user(request, f"Approved {count} drafts.")


bulk_approve_drafts.short_description = "Approve selected drafts"


def upload_csv_action(modeladmin, request, queryset):
    """Admin action to redirect to CSV upload form"""
    # This action doesn't require any items to be selected
    # Redirect to the CSV upload view regardless of queryset
    return HttpResponseRedirect(reverse("glossary_upload_csv"))


upload_csv_action.short_description = "Upload CSV file"


# Inline for EntryDraft under Entry
class EntryDraftInline(admin.TabularInline):
    model = EntryDraft
    extra = 0
    fields = (
        "author",
        "content",
        "created_at",
        "approval_count_display",
        "is_approved",
    )
    readonly_fields = ("created_at", "approval_count_display", "is_approved")
    can_delete = False

    def approval_count_display(self, obj):
        if obj.id:
            return f"{obj.approval_count} approvals"
        return "N/A"

    approval_count_display.short_description = "Approvals"

    def is_approved(self, obj):
        if obj.id:
            return obj.is_approved
        return False

    is_approved.boolean = True


# Inline for Comments on EntryDraft
class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ("author", "text", "is_resolved", "created_at")
    readonly_fields = ("created_at",)
    fk_name = "draft"


@admin.register(Perspective)
class PerspectiveAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "description_short",
        "is_deleted",
        "created_at",
        "created_by",
    )
    list_filter = ("is_deleted", "created_at")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
    actions = [soft_delete_selected, undelete_selected]

    def description_short(self, obj):
        if len(obj.description) > 50:
            return obj.description[:50] + "..."
        return obj.description

    description_short.short_description = "Description"


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = (
        "text",
        "text_normalized",
        "is_official",
        "is_deleted",
        "created_at",
    )
    list_filter = ("is_official", "is_deleted", "created_at")
    search_fields = ("text", "text_normalized")
    readonly_fields = (
        "text_normalized",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )
    actions = [soft_delete_selected, undelete_selected, mark_official_selected]


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    list_display = (
        "term",
        "perspective",
        "is_official",
        "active_draft_display",
        "is_deleted",
        "created_at",
    )
    list_filter = ("is_official", "is_deleted", "perspective", "created_at")
    search_fields = ("term__text", "perspective__name")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
    inlines = [EntryDraftInline]
    actions = [
        soft_delete_selected,
        undelete_selected,
        mark_official_selected,
    ]

    def changelist_view(self, request, extra_context=None):
        """Add custom context for changelist view"""
        extra_context = extra_context or {}
        extra_context["show_csv_upload_link"] = request.user.is_superuser
        return super().changelist_view(request, extra_context=extra_context)

    def active_draft_display(self, obj):
        draft = obj.get_latest_draft()
        if draft:
            return format_html('<span style="color: green;">draft{}</span>', draft.id)
        return format_html('<span style="color: gray;">No drafts</span>')

    active_draft_display.short_description = "Active Draft"


@admin.register(EntryDraft)
class EntryDraftAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "entry",
        "author",
        "created_at",
        "approval_count_display",
        "is_approved_display",
        "is_deleted",
    )
    list_filter = ("created_at", "is_deleted", "entry__perspective")
    search_fields = ("entry__term__text", "author__username", "content")
    readonly_fields = (
        "approval_count_display",
        "is_approved_display",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )
    # Note: filter_horizontal removed because approvers uses a custom through model
    inlines = [CommentInline]
    actions = [soft_delete_selected, undelete_selected, bulk_approve_drafts]

    formfield_overrides = {
        models.TextField: {"widget": admin.widgets.AdminTextareaWidget()},
    }

    def approval_count_display(self, obj):
        return obj.approval_count

    approval_count_display.short_description = "Approval Count"

    def is_approved_display(self, obj):
        return obj.is_approved

    is_approved_display.boolean = True
    is_approved_display.short_description = "Is Approved"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "author",
        "draft",
        "text_short",
        "parent",
        "is_resolved",
        "is_deleted",
        "created_at",
    )
    list_filter = (
        "is_resolved",
        "is_deleted",
        "created_at",
        "draft__entry__perspective",
    )
    search_fields = ("text", "author__username", "draft__entry__term__text")
    readonly_fields = (
        "created_at",
        "updated_at",
        "edited_at",
        "created_by",
        "updated_by",
    )
    actions = [soft_delete_selected, undelete_selected]

    def text_short(self, obj):
        if len(obj.text) > 50:
            return obj.text[:50] + "..."
        return obj.text

    text_short.short_description = "Text"


@admin.register(PerspectiveCurator)
class PerspectiveCuratorAdmin(admin.ModelAdmin):
    list_display = ("user", "perspective", "assigned_by", "is_deleted", "created_at")
    list_filter = ("is_deleted", "perspective", "created_at")
    search_fields = ("user__username", "perspective__name")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
    actions = [soft_delete_selected, undelete_selected]


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "is_test_user", "is_deleted", "created_at")
    list_filter = ("is_test_user", "is_deleted", "created_at")
    search_fields = ("user__username", "user__first_name", "user__last_name")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
    actions = [soft_delete_selected, undelete_selected]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ("id", "comment", "user", "reaction_type", "created_at")
    list_filter = ("reaction_type", "created_at")
    search_fields = ("comment__text", "user__username")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
    actions = [soft_delete_selected, undelete_selected]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "type",
        "message_short",
        "is_read",
        "created_at",
    )
    list_filter = ("type", "is_read", "created_at")
    search_fields = ("user__username", "message")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
    actions = [soft_delete_selected, undelete_selected]

    def message_short(self, obj):
        if len(obj.message) > 50:
            return obj.message[:50] + "..."
        return obj.message

    message_short.short_description = "Message"


# CSV Upload Admin View - Helper functions
def _get_upload_context():
    """Get context for CSV upload template."""
    return {
        "title": "Upload CSV",
        "opts": Entry._meta,
        "has_permission": True,
        "site_header": admin.site.site_header,
        "site_title": admin.site.site_title,
    }


def _validate_csv_file(csv_file, request):
    """Validate uploaded CSV file. Returns (is_valid, error_message)."""
    if not csv_file:
        if not request.FILES:
            return (
                False,
                "No file was uploaded. Please ensure the form has enctype='multipart/form-data'.",
            )
        if "csv_file" not in request.FILES:
            return (
                False,
                "File field 'csv_file' not found in request. Please select a CSV file.",
            )
        return False, "Please select a CSV file to upload."

    if csv_file.size > 10 * 1024 * 1024:
        return False, "File size exceeds 10MB limit. Please upload a smaller file."

    if not csv_file.name.endswith(".csv"):
        return False, "Please upload a CSV file (.csv extension)."

    return True, None


def _handle_upload_success(summary, request):
    """Handle successful CSV upload with messages."""
    from django.contrib import messages

    success_msg = (
        f"CSV uploaded successfully. "
        f"Entries created: {summary['entries_created']}, "
        f"Drafts created: {summary['drafts_created']}, "
        f"Skipped: {summary['skipped']}"
    )
    if summary.get("cross_references_resolved", 0) > 0:
        success_msg += (
            f", Cross-references resolved: {summary['cross_references_resolved']}"
        )
    success_msg += "."
    messages.success(request, success_msg)

    if summary["errors"]:
        for error in summary["errors"][:10]:
            messages.warning(request, error)
        if len(summary["errors"]) > 10:
            messages.warning(
                request, f"... and {len(summary['errors']) - 10} more errors."
            )


@staff_member_required
@csrf_protect
def csv_upload_view(request):
    """Custom admin view for CSV upload"""
    if not request.user.is_superuser:
        from django.contrib import messages
        from django.shortcuts import redirect

        messages.error(request, "Only superusers can upload CSV files.")
        return redirect("admin:glossary_entry_changelist")

    if request.method == "POST":
        csv_file = request.FILES.get("csv_file")
        skip_duplicates = request.POST.get("skip_duplicates") == "on"

        is_valid, error_msg = _validate_csv_file(csv_file, request)
        if not is_valid:
            from django.contrib import messages

            messages.error(request, error_msg)
            return render(
                request, "admin/glossary/csv_upload.html", _get_upload_context()
            )

        try:
            summary = load_entries_from_csv(
                csv_file, request.user, skip_duplicates=skip_duplicates
            )
            _handle_upload_success(summary, request)
            return HttpResponseRedirect(reverse("admin:glossary_entry_changelist"))
        except Exception as e:
            from django.contrib import messages

            messages.error(request, f"Error processing CSV: {str(e)}")
            return render(
                request, "admin/glossary/csv_upload.html", _get_upload_context()
            )

    return render(request, "admin/glossary/csv_upload.html", _get_upload_context())
