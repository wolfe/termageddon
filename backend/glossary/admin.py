from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from django.utils.html import format_html
from django.db import models

from glossary.models import (
    Comment,
    Perspective,
    PerspectiveCurator,
    Entry,
    EntryDraft,
    Term,
)


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


# Inline for EntryDraft under Entry
class EntryDraftInline(admin.TabularInline):
    model = EntryDraft
    extra = 0
    fields = ("author", "content", "timestamp", "approval_count_display", "is_approved")
    readonly_fields = ("timestamp", "approval_count_display", "is_approved")
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


# Inline for Comments (generic)
class CommentInline(GenericTabularInline):
    model = Comment
    extra = 0
    fields = ("author", "text", "is_resolved", "created_at")
    readonly_fields = ("created_at",)


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
    actions = [soft_delete_selected, undelete_selected, mark_official_selected]

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
        "timestamp",
        "approval_count_display",
        "is_approved_display",
        "is_deleted",
    )
    list_filter = ("timestamp", "is_deleted", "entry__perspective")
    search_fields = ("entry__term__text", "author__username", "content")
    readonly_fields = (
        "timestamp",
        "approval_count_display",
        "is_approved_display",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )
    filter_horizontal = ("approvers",)
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
        "text_short",
        "parent",
        "is_resolved",
        "is_deleted",
        "created_at",
    )
    list_filter = ("is_resolved", "is_deleted", "created_at")
    search_fields = ("text", "author__username")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
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
